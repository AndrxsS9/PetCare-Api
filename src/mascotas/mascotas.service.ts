import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MascotaEntity } from './mascota.entity.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { isAdmin, petOwnershipWhere } from '../auth/ownership.js';

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

  async findAll(user: AuthenticatedUser): Promise<MascotaEntity[]> {
    const mascotas = await this.mascotaRepository.find({
      where: petOwnershipWhere(user),
      relations: {
        usuario: true,
      },
    });

    return mascotas.map((m) => this.sanitizeMascota(m));
  }

  async findById(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MascotaEntity }> {
    // Foreign pets are filtered by the query itself and reported as 404.
    const mascota = await this.mascotaRepository.findOne({
      where: { id, ...petOwnershipWhere(user) },
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
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MascotaEntity }> {
    // Regular users always own the pets they register; only ADMIN may choose
    // another owner. The body's usuarioId is never proof of authorization.
    const ownerId = mascotaPayload.usuarioId ?? user.id;

    if (!isAdmin(user) && ownerId !== user.id) {
      throw new ForbiddenException('Solo puedes registrar mascotas a tu nombre');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: ownerId },
    });

    if (!usuario) {
      throw new NotFoundException(
        `El usuario con ID ${ownerId} no existe. No se puede asociar una mascota a un usuario inexistente`,
      );
    }

    const newMascota = this.mascotaRepository.create({
      ...mascotaPayload,
      usuarioId: ownerId,
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
    user: AuthenticatedUser,
  ): Promise<{ message: string; data: MascotaEntity }> {
    // Ownership is verified by the lookup itself, before any field changes.
    const mascota = await this.mascotaRepository.findOne({
      where: { id, ...petOwnershipWhere(user) },
      relations: {
        usuario: true,
      },
    });

    if (!mascota) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }

    if (mascotaChanges.usuarioId && mascotaChanges.usuarioId !== mascota.usuarioId) {
      if (!isAdmin(user)) {
        throw new ForbiddenException(
          'Solo un administrador puede transferir la propiedad de una mascota',
        );
      }

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

  async delete(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    // Related records are removed by the ON DELETE CASCADE foreign keys.
    const mascota = await this.mascotaRepository.findOne({
      where: { id, ...petOwnershipWhere(user) },
    });

    if (!mascota) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }

    await this.mascotaRepository.remove(mascota);

    return {
      message: 'Mascota eliminada con éxito',
    };
  }
}
