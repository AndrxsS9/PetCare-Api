import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlimentacionEntity } from './alimentacion.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  petRecordOwnershipWhere,
} from '../auth/ownership.js';
import {
  CreateAlimentacionDto,
  UpdateAlimentacionDto,
} from './alimentacion.dto.js';

const UPDATABLE_FIELDS = [
  'tipoAlimento',
  'marca',
  'cantidad',
  'unidad',
  'frecuencia',
  'horario',
  'observaciones',
] as const satisfies readonly (keyof UpdateAlimentacionDto)[];

@Injectable()
export class AlimentacionesService {
  constructor(
    @InjectRepository(AlimentacionEntity)
    private readonly alimentacionRepository: Repository<AlimentacionEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<AlimentacionEntity[]> {
    // The ownership filter is part of the SQL query (join on mascotas).
    return this.alimentacionRepository.find({
      where: petRecordOwnershipWhere<AlimentacionEntity>(user),
    });
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    // Foreign records are excluded by the query itself and reported as 404.
    const data = await this.alimentacionRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<AlimentacionEntity>(user) },
    });

    if (!data) {
      throw new NotFoundException(`Alimentación con ID ${id} no encontrada`);
    }

    return {
      message: 'Alimentación encontrada',
      data,
    };
  }

  async create(
    alimentacionPayload: CreateAlimentacionDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    // Unknown pets and pets owned by someone else both produce 404, so a
    // client-supplied mascotaId cannot attach records to another owner's pet.
    await findAccessibleMascota(this.mascotaRepository, alimentacionPayload.mascotaId, user);

    const newAlimentacion = this.alimentacionRepository.create({
      mascotaId: alimentacionPayload.mascotaId,
      tipoAlimento: alimentacionPayload.tipoAlimento,
      marca: alimentacionPayload.marca,
      cantidad: alimentacionPayload.cantidad,
      unidad: alimentacionPayload.unidad,
      frecuencia: alimentacionPayload.frecuencia,
      horario: alimentacionPayload.horario,
      observaciones: alimentacionPayload.observaciones ?? '',
    });

    const data = await this.alimentacionRepository.save(newAlimentacion);

    return {
      message: 'Alimentación creada con éxito',
      data,
    };
  }

  async update(
    id: string,
    alimentacionChanges: UpdateAlimentacionDto,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const alimentacion = await this.alimentacionRepository.findOne({
      where: { id, ...petRecordOwnershipWhere<AlimentacionEntity>(user) },
    });

    if (!alimentacion) {
      throw new NotFoundException(`Alimentación con ID ${id} no encontrada`);
    }

    const changes: Partial<AlimentacionEntity> = {};
    for (const field of UPDATABLE_FIELDS) {
      const value = alimentacionChanges[field];
      if (value !== undefined) {
        (changes as Record<string, unknown>)[field] = value;
      }
    }

    const updatedAlimentacion = this.alimentacionRepository.merge(
      alimentacion,
      changes,
    );
    const data = await this.alimentacionRepository.save(updatedAlimentacion);

    return {
      message: 'Alimentación actualizada con éxito',
      data,
    };
  }

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const result = await deletePetRecord(this.alimentacionRepository, id, user);

    if (!result.affected) {
      throw new NotFoundException(`Alimentación con ID ${id} no encontrada`);
    }

    return {
      message: 'Alimentación eliminada con éxito',
    };
  }
}
