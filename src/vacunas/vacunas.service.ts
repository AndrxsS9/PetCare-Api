import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VacunaEntity } from './vacuna.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
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

  async findAll(): Promise<VacunaEntity[]> {
    return this.vacunaRepository.find();
  }

  async findById(id: string): Promise<{ message: string; data: VacunaEntity }> {
    const data = await this.vacunaRepository.findOne({ where: { id } });

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
  ): Promise<{ message: string; data: VacunaEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id: vacunaPayload.mascota_id },
    });

    if (!mascota) {
      throw new NotFoundException(
        `Mascota con ID ${vacunaPayload.mascota_id} no encontrada`,
      );
    }

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
  ): Promise<{ message: string; data: VacunaEntity }> {
    const vacuna = await this.vacunaRepository.findOne({ where: { id } });

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

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.vacunaRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }

    return {
      message: 'Vacuna eliminada con éxito',
    };
  }
}
