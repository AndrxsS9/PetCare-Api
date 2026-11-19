import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlimentacionEntity } from './alimentacion.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
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

  async findAll(): Promise<AlimentacionEntity[]> {
    return this.alimentacionRepository.find();
  }

  async findById(
    id: string,
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    const data = await this.alimentacionRepository.findOne({ where: { id } });

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
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id: alimentacionPayload.mascotaId },
    });

    if (!mascota) {
      throw new NotFoundException(
        `Mascota con ID ${alimentacionPayload.mascotaId} no encontrada`,
      );
    }

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
  ): Promise<{ message: string; data: AlimentacionEntity }> {
    const alimentacion = await this.alimentacionRepository.findOne({
      where: { id },
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

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.alimentacionRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Alimentación con ID ${id} no encontrada`);
    }

    return {
      message: 'Alimentación eliminada con éxito',
    };
  }
}
