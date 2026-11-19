import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VacunaEntity } from './vacuna.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  petRecordOwnershipWhere,
} from '../auth/ownership.js';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';

/**
 * Converts an ISO 8601 string into a Date at local midnight of the calendar
 * day written in it (its leading YYYY-MM-DD).
 *
 * `new Date('2024-01-10')` would be UTC midnight, but TypeORM serializes
 * `date` columns with local getters, which in UTC-5 would store 2024-01-09.
 * Building the Date from its local components keeps the day intact in any
 * server timezone.
 */
export const toCalendarDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

@Injectable()
export class VacunasService {
  constructor(
    @InjectRepository(VacunaEntity)
    private readonly vacunaRepository: Repository<VacunaEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<VacunaEntity[]> {
    // The ownership filter is part of the SQL query (join on mascotas).
    return this.vacunaRepository.find({
      where: petRecordOwnershipWhere<VacunaEntity>(user),
    });
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: VacunaEntity }> {
    // Foreign records are excluded by the query itself and reported as 404.
    const data = await this.vacunaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<VacunaEntity>(user) },
    });

    if (!data) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }

    return {
      message: 'Vacuna encontrada',
      data,
    };
  }

  async create(
    vacunaPayload: CreateVacunaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: VacunaEntity }> {
    // Unknown pets and pets owned by someone else both produce 404, so a
    // client-supplied mascota_id cannot attach records to another owner's pet.
    await findAccessibleMascota(this.mascotaRepository, vacunaPayload.mascota_id, user);

    const newVacuna = this.vacunaRepository.create({
      mascota_id: vacunaPayload.mascota_id,
      nombreVacuna: vacunaPayload.nombreVacuna,
      fechaAplicacion: toCalendarDate(vacunaPayload.fechaAplicacion),
      loteVacuna: vacunaPayload.loteVacuna,
      observaciones: vacunaPayload.observaciones ?? '',
      proximaDosis: toCalendarDate(vacunaPayload.proximaDosis),
    });

    const data = await this.vacunaRepository.save(newVacuna);

    return {
      message: 'Vacuna registrada con éxito',
      data,
    };
  }

  async update(
    id: string,
    vacunaChanges: UpdateVacunaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: VacunaEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const vacuna = await this.vacunaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<VacunaEntity>(user) },
    });

    if (!vacuna) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }

    // Only allowed fields are copied, so `id` and `mascota_id` can never be
    // changed through this method even if they reach it.
    const changes: Partial<VacunaEntity> = {};
    if (vacunaChanges.nombreVacuna !== undefined) {
      changes.nombreVacuna = vacunaChanges.nombreVacuna;
    }
    if (vacunaChanges.fechaAplicacion !== undefined) {
      changes.fechaAplicacion = toCalendarDate(vacunaChanges.fechaAplicacion);
    }
    if (vacunaChanges.loteVacuna !== undefined) {
      changes.loteVacuna = vacunaChanges.loteVacuna;
    }
    if (vacunaChanges.observaciones !== undefined) {
      changes.observaciones = vacunaChanges.observaciones;
    }
    if (vacunaChanges.proximaDosis !== undefined) {
      changes.proximaDosis = toCalendarDate(vacunaChanges.proximaDosis);
    }

    const updatedVacuna = this.vacunaRepository.merge(vacuna, changes);
    const data = await this.vacunaRepository.save(updatedVacuna);

    return {
      message: 'Vacuna actualizada con éxito',
      data,
    };
  }

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const result = await deletePetRecord(this.vacunaRepository, id, user);

    if (!result.affected) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }

    return {
      message: 'Vacuna eliminada con éxito',
    };
  }
}
