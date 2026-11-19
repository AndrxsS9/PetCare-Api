import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicamentoEntity } from './medicamento.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  petRecordOwnershipWhere,
} from '../auth/ownership.js';
import {
  CreateMedicamentoDto,
  UpdateMedicamentoDto,
} from './medicamento.dto.js';
// Reuses the timezone-safe ISO -> `date` column conversion validated in
// Vacunas: it keeps the calendar day written by the client regardless of the
// server timezone.
import { toCalendarDate } from '../vacunas/vacunas.service.js';

@Injectable()
export class MedicamentosService {
  constructor(
    @InjectRepository(MedicamentoEntity)
    private readonly medicamentoRepository: Repository<MedicamentoEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<MedicamentoEntity[]> {
    // The ownership filter is part of the SQL query (join on mascotas).
    return this.medicamentoRepository.find({
      where: petRecordOwnershipWhere<MedicamentoEntity>(user),
    });
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    // Foreign records are excluded by the query itself and reported as 404.
    const data = await this.medicamentoRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<MedicamentoEntity>(user) },
    });

    if (!data) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }

    return {
      message: 'Medicamento encontrado',
      data,
    };
  }

  async create(
    medicamentoPayload: CreateMedicamentoDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    // Unknown pets and pets owned by someone else both produce 404, so a
    // client-supplied mascotaId cannot attach records to another owner's pet.
    await findAccessibleMascota(this.mascotaRepository, medicamentoPayload.mascotaId, user);

    const newMedicamento = this.medicamentoRepository.create({
      mascotaId: medicamentoPayload.mascotaId,
      nombreMedicamento: medicamentoPayload.nombreMedicamento,
      dosis: medicamentoPayload.dosis,
      frecuencia: medicamentoPayload.frecuencia,
      inicio: toCalendarDate(medicamentoPayload.inicio),
      fin: toCalendarDate(medicamentoPayload.fin),
      observaciones: medicamentoPayload.observaciones ?? '',
      estado: medicamentoPayload.estado ?? true,
    });

    const data = await this.medicamentoRepository.save(newMedicamento);

    return {
      message: 'Medicamento creado con éxito',
      data,
    };
  }

  async update(
    id: string,
    medicamentoChanges: UpdateMedicamentoDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const medicamento = await this.medicamentoRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<MedicamentoEntity>(user) },
    });

    if (!medicamento) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }

    // Only allowed fields are copied, so `id` and `mascotaId` can never be
    // changed through this method even if they reach it. `!== undefined`
    // keeps an explicit `estado: false`.
    const changes: Partial<MedicamentoEntity> = {};
    if (medicamentoChanges.nombreMedicamento !== undefined) {
      changes.nombreMedicamento = medicamentoChanges.nombreMedicamento;
    }
    if (medicamentoChanges.dosis !== undefined) {
      changes.dosis = medicamentoChanges.dosis;
    }
    if (medicamentoChanges.frecuencia !== undefined) {
      changes.frecuencia = medicamentoChanges.frecuencia;
    }
    if (medicamentoChanges.inicio !== undefined) {
      changes.inicio = toCalendarDate(medicamentoChanges.inicio);
    }
    if (medicamentoChanges.fin !== undefined) {
      changes.fin = toCalendarDate(medicamentoChanges.fin);
    }
    if (medicamentoChanges.observaciones !== undefined) {
      changes.observaciones = medicamentoChanges.observaciones;
    }
    if (medicamentoChanges.estado !== undefined) {
      changes.estado = medicamentoChanges.estado;
    }

    const updatedMedicamento = this.medicamentoRepository.merge(
      medicamento,
      changes,
    );
    const data = await this.medicamentoRepository.save(updatedMedicamento);

    return {
      message: 'Medicamento actualizado con éxito',
      data,
    };
  }

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const result = await deletePetRecord(this.medicamentoRepository, id, user);

    if (!result.affected) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }

    return {
      message: 'Medicamento eliminado con éxito',
    };
  }
}
