import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitaEntity } from './cita.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  petRecordOwnershipWhere,
} from '../auth/ownership.js';
import { CreateCitaDto, UpdateCitaDto, EstadoCita } from './cita.dto.js';

@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(CitaEntity)
    private readonly citaRepository: Repository<CitaEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<CitaEntity[]> {
    // The ownership filter is part of the SQL query (join on mascotas).
    return this.citaRepository.find({
      where: petRecordOwnershipWhere<CitaEntity>(user),
    });
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: CitaEntity }> {
    // Foreign records are excluded by the query itself and reported as 404.
    const data = await this.citaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<CitaEntity>(user) },
    });

    if (!data) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return {
      message: 'Cita encontrada',
      data,
    };
  }

  async create(
    citaPayload: CreateCitaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: CitaEntity }> {
    // Unknown pets and pets owned by someone else both produce 404, so a
    // client-supplied mascotaId cannot attach records to another owner's pet.
    await findAccessibleMascota(this.mascotaRepository, citaPayload.mascotaId, user);

    const newCita = this.citaRepository.create({
      mascotaId: citaPayload.mascotaId,
      fechaHora: new Date(citaPayload.fechaHora),
      motivo: citaPayload.motivo,
      lugarveterinaria: citaPayload.lugarveterinaria,
      estado: citaPayload.estado ?? EstadoCita.PROGRAMADA,
    });

    const data = await this.citaRepository.save(newCita);

    return {
      message: 'Cita creada con éxito',
      data,
    };
  }

  async update(
    id: string,
    citaChanges: UpdateCitaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: CitaEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const cita = await this.citaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<CitaEntity>(user) },
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    const changes: Partial<CitaEntity> = {};
    if (citaChanges.fechaHora !== undefined) {
      changes.fechaHora = new Date(citaChanges.fechaHora);
    }
    if (citaChanges.motivo !== undefined) changes.motivo = citaChanges.motivo;
    if (citaChanges.lugarveterinaria !== undefined) {
      changes.lugarveterinaria = citaChanges.lugarveterinaria;
    }
    if (citaChanges.estado !== undefined) changes.estado = citaChanges.estado;

    const updatedCita = this.citaRepository.merge(cita, changes);
    const data = await this.citaRepository.save(updatedCita);

    return {
      message: 'Cita actualizada con éxito',
      data,
    };
  }

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const result = await deletePetRecord(this.citaRepository, id, user);

    if (!result.affected) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return {
      message: 'Cita eliminada con éxito',
    };
  }
}
