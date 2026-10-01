import { Injectable, NotFoundException } from '@nestjs/common';
import { Mascota } from './mascota.model.js';
import { CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';

@Injectable()
export class MascotasService {
  private mascotas: Mascota[] = [
    {
      id: '1',
      usuarioId: '1',
      nombre: 'Max',
      especie: 'PERRO',
      raza: 'Labrador',
      fecha_nacimiento: new Date('2020-03-15'),
      peso: 28.5,
      fotoUrl: '',
      estado: true,
    },
    {
      id: '2',
      usuarioId: '1',
      nombre: 'Luna',
      especie: 'GATO',
      raza: 'Siamés',
      fecha_nacimiento: new Date('2021-07-10'),
      peso: 4.2,
      fotoUrl: '',
      estado: true,
    },
    {
      id: '3',
      usuarioId: '2',
      nombre: 'Rocky',
      especie: 'PERRO',
      raza: 'Bulldog',
      fecha_nacimiento: new Date('2019-11-20'),
      peso: 22.0,
      fotoUrl: '',
      estado: true,
    },
  ];

  findAll() {
    return this.mascotas;
  }

  findById(id: string) {
    const data = this.mascotas.find((mascota) => mascota.id === id);
    if (data === undefined) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }
    return {
      message: 'Mascota encontrada',
      data,
    };
  }

  create(mascotaPayload: CreateMascotaDto) {
    const newMascota: Mascota = {
      ...mascotaPayload,
      id: `${new Date().getTime()}`,
      fotoUrl: mascotaPayload.fotoUrl ?? '',
      estado: mascotaPayload.estado ?? true,
    };
    this.mascotas.push(newMascota);
    return {
      message: 'Mascota creada con éxito',
      data: newMascota,
    };
  }

  update(id: string, mascotaChanges: UpdateMascotaDto) {
    const position = this.mascotas.findIndex((mascota) => mascota.id === id);
    if (position === -1) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }
    const existingMascota = this.mascotas[position];
    const updatedMascota = { ...existingMascota, ...mascotaChanges };
    this.mascotas[position] = updatedMascota;
    return {
      message: 'Mascota actualizada con éxito',
      data: updatedMascota,
    };
  }

  delete(id: string) {
    const position = this.mascotas.findIndex((mascota) => mascota.id === id);
    if (position === -1) {
      throw new NotFoundException(`Mascota con ID ${id} no encontrada`);
    }
    this.mascotas.splice(position, 1);
    return {
      message: 'Mascota eliminada con éxito',
    };
  }
}
