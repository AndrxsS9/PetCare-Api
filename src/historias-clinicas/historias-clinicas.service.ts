import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoriaClinicaEntity } from './historia-clinica.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  petRecordOwnershipWhere,
} from '../auth/ownership.js';
import {
  CreateHistoriaClinicaDto,
  UpdateHistoriaClinicaDto,
} from './historia-clinica.dto.js';

@Injectable()
export class HistoriasClinicasService {
  constructor(
    @InjectRepository(HistoriaClinicaEntity)
    private readonly historiaRepository: Repository<HistoriaClinicaEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<HistoriaClinicaEntity[]> {
    // The ownership filter is part of the SQL query (join on mascotas).
    return this.historiaRepository.find({
      where: petRecordOwnershipWhere<HistoriaClinicaEntity>(user),
    });
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: HistoriaClinicaEntity }> {
    // Foreign records are excluded by the query itself and reported as 404.
    const data = await this.historiaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<HistoriaClinicaEntity>(user) },
    });

    if (!data) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }

    return {
      message: 'Historia clínica encontrada',
      data,
    };
  }

  async create(
    historiaPayload: CreateHistoriaClinicaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: HistoriaClinicaEntity }> {
    // Unknown pets and pets owned by someone else both produce 404, so a
    // client-supplied mascotaId cannot attach records to another owner's pet.
    await findAccessibleMascota(this.mascotaRepository, historiaPayload.mascotaId, user);

    const newHistoria = this.historiaRepository.create({
      mascotaId: historiaPayload.mascotaId,
      fechaConsulta: new Date(historiaPayload.fechaConsulta),
      diagnostico: historiaPayload.diagnostico,
      observaciones: historiaPayload.observaciones ?? '',
      pesoRegistrado: historiaPayload.pesoRegistrado,
      veterinarioResponsable: historiaPayload.veterinarioResponsable,
    });

    const data = await this.historiaRepository.save(newHistoria);

    return {
      message: 'Historia clínica creada con éxito',
      data,
    };
  }

  async update(
    id: string,
    historiaChanges: UpdateHistoriaClinicaDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: HistoriaClinicaEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const historia = await this.historiaRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<HistoriaClinicaEntity>(user) },
    });

    if (!historia) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }

    const changes: Partial<HistoriaClinicaEntity> = {};
    if (historiaChanges.fechaConsulta !== undefined) {
      changes.fechaConsulta = new Date(historiaChanges.fechaConsulta);
    }
    if (historiaChanges.diagnostico !== undefined) {
      changes.diagnostico = historiaChanges.diagnostico;
    }
    if (historiaChanges.observaciones !== undefined) {
      changes.observaciones = historiaChanges.observaciones;
    }
    if (historiaChanges.pesoRegistrado !== undefined) {
      changes.pesoRegistrado = historiaChanges.pesoRegistrado;
    }
    if (historiaChanges.veterinarioResponsable !== undefined) {
      changes.veterinarioResponsable = historiaChanges.veterinarioResponsable;
    }

    const updatedHistoria = this.historiaRepository.merge(historia, changes);
    const data = await this.historiaRepository.save(updatedHistoria);

    return {
      message: 'Historia clínica actualizada con éxito',
      data,
    };
  }

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const result = await deletePetRecord(this.historiaRepository, id, user);

    if (!result.affected) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }

    return {
      message: 'Historia clínica eliminada con éxito',
    };
  }
}
