import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitaEntity } from './cita.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CreateCitaDto, UpdateCitaDto, EstadoCita } from './cita.dto.js';

@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(CitaEntity)
    private readonly citaRepository: Repository<CitaEntity>,
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
  ) {}

  async findAll(): Promise<CitaEntity[]> {
    return this.citaRepository.find();
  }

  async findById(id: string): Promise<{ message: string; data: CitaEntity }> {
    const data = await this.citaRepository.findOne({ where: { id } });

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
  ): Promise<{ message: string; data: CitaEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id: citaPayload.mascotaId },
    });

    if (!mascota) {
      throw new NotFoundException(
        `Mascota con ID ${citaPayload.mascotaId} no encontrada`,
      );
    }

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
  ): Promise<{ message: string; data: CitaEntity }> {
    const cita = await this.citaRepository.findOne({ where: { id } });

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

  async delete(id: string): Promise<{ message: string }> {
    const result = await this.citaRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return {
      message: 'Cita eliminada con éxito',
    };
  }
}
