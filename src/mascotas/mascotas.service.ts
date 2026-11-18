import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MascotaEntity } from './mascota.entity.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';

@Injectable()
export class MascotasService {
  constructor(
    @InjectRepository(MascotaEntity)
    private readonly mascotaRepository: Repository<MascotaEntity>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepository: Repository<UsuarioEntity>,
  ) {}

  private sanitizeMascota(mascota: MascotaEntity): MascotaEntity {
    if (mascota.usuario && 'password' in mascota.usuario) {
      const { password: _, ...usuarioSinPassword } = mascota.usuario;
      mascota.usuario = usuarioSinPassword as UsuarioEntity;
    }
    return mascota;
  }

  async findAll(): Promise<MascotaEntity[]> {
    const mascotas = await this.mascotaRepository.find({
      relations: {
        usuario: true,
      },
    });

    return mascotas.map((m) => this.sanitizeMascota(m));
  }

  async findById(id: string): Promise<{ message: string; data: MascotaEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id },
      relations: {
        usuario: true,
      },
    });

    if (!mascota) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }

    return {
      message: 'Mascota encontrada',
      data: this.sanitizeMascota(mascota),
    };
  }

  async create(
    mascotaPayload: CreateMascotaDto,
  ): Promise<{ message: string; data: MascotaEntity }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: mascotaPayload.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException(
        `El usuario con ID ${mascotaPayload.usuarioId} no existe. No se puede asociar una mascota a un usuario inexistente`,
      );
    }

    const newMascota = this.mascotaRepository.create({
      ...mascotaPayload,
      fotoUrl: mascotaPayload.fotoUrl ?? '',
      estado: mascotaPayload.estado ?? true,
      usuario,
    });

    const savedMascota = await this.mascotaRepository.save(newMascota);

    return {
      message: 'Mascota creada con éxito',
      data: this.sanitizeMascota(savedMascota),
    };
  }

  async update(
    id: string,
    mascotaChanges: UpdateMascotaDto,
  ): Promise<{ message: string; data: MascotaEntity }> {
    const mascota = await this.mascotaRepository.findOne({
      where: { id },
      relations: {
        usuario: true,
      },
    });

    if (!mascota) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }

    if (mascotaChanges.usuarioId && mascotaChanges.usuarioId !== mascota.usuarioId) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: mascotaChanges.usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException(
          `El usuario con ID ${mascotaChanges.usuarioId} no existe. No se puede transferir una mascota a un usuario inexistente`,
        );
      }

      mascota.usuarioId = mascotaChanges.usuarioId;
      mascota.usuario = usuario;
    }

    if (mascotaChanges.nombre !== undefined) mascota.nombre = mascotaChanges.nombre;
    if (mascotaChanges.especie !== undefined) mascota.especie = mascotaChanges.especie;
    if (mascotaChanges.raza !== undefined) mascota.raza = mascotaChanges.raza;
    if (mascotaChanges.fecha_nacimiento !== undefined) {
      mascota.fecha_nacimiento = mascotaChanges.fecha_nacimiento;
    }
    if (mascotaChanges.peso !== undefined) mascota.peso = mascotaChanges.peso;
    if (mascotaChanges.fotoUrl !== undefined) mascota.fotoUrl = mascotaChanges.fotoUrl;
    if (mascotaChanges.estado !== undefined) mascota.estado = mascotaChanges.estado;

    const updatedMascota = await this.mascotaRepository.save(mascota);

    return {
      message: 'Mascota actualizada con éxito',
      data: this.sanitizeMascota(updatedMascota),
    };
  }

  async delete(id: string): Promise<{ message: string }> {
    const mascota = await this.mascotaRepository.findOne({ where: { id } });

    if (!mascota) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }

    await this.mascotaRepository.remove(mascota);

    return {
      message: 'Mascota eliminada con éxito',
    };
  }
}
