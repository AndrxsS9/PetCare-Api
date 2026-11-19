import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicamentoEntity } from './medicamento.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
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

  async findAll(): Promise<MedicamentoEntity[]> {
    return this.medicamentoRepository.find();
  }

  async findById(
    id: string,
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    const data = await this.medicamentoRepository.findOne({ where: { id } });

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
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id: medicamentoPayload.mascotaId },
    });

    if (!mascota) {
      throw new NotFoundException(
        `Mascota con ID ${medicamentoPayload.mascotaId} no encontrada`,
      );
    }

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
  ): Promise<{ message: string; data: MedicamentoEntity }> {
    const medicamento = await this.medicamentoRepository.findOne({
      where: { id },
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

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.medicamentoRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }

    return {
      message: 'Medicamento eliminado con éxito',
    };
  }
}
