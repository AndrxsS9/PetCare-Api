import { Injectable, NotFoundException } from '@nestjs/common';
import { Alimentacion } from './alimentacion.model.js';
import { CreateAlimentacionDto, UpdateAlimentacionDto } from './alimentacion.dto.js';

@Injectable()
export class AlimentacionesService {
  private alimentaciones: Alimentacion[] = [
    {
      id: '1',
      mascotaId: '1',
      tipoAlimento: 'Concentrado',
      marca: 'Royal Canin',
      cantidad: 250,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '08:00 y 18:00',
      observaciones: 'Dividir la porción en dos comidas',
    },
    {
      id: '2',
      mascotaId: '2',
      tipoAlimento: 'Concentrado',
      marca: 'Purina',
      cantidad: 80,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '09:00 y 19:00',
      observaciones: '',
    },
  ];

  findAll() {
    return this.alimentaciones;
  }

  findById(id: string) {
    const data = this.alimentaciones.find(
      (alimentacion) => alimentacion.id === id,
    );
    if (data === undefined) {
      throw new NotFoundException(
        `Alimentación con ID ${id} no encontrada`,
      );
    }
    return {
      message: 'Alimentación encontrada',
      data,
    };
  }

  create(alimentacionPayload: CreateAlimentacionDto) {
    const newAlimentacion: Alimentacion = {
      ...alimentacionPayload,
      id: `${new Date().getTime()}`,
      observaciones: alimentacionPayload.observaciones ?? '',
    };
    this.alimentaciones.push(newAlimentacion);
    return {
      message: 'Alimentación creada con éxito',
      data: newAlimentacion,
    };
  }

  update(id: string, alimentacionChanges: UpdateAlimentacionDto) {
    const position = this.alimentaciones.findIndex(
      (alimentacion) => alimentacion.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(
        `Alimentación con ID ${id} no encontrada`,
      );
    }
    const existingAlimentacion = this.alimentaciones[position];
    const updatedAlimentacion = {
      ...existingAlimentacion,
      ...alimentacionChanges,
    };
    this.alimentaciones[position] = updatedAlimentacion;
    return {
      message: 'Alimentación actualizada con éxito',
      data: updatedAlimentacion,
    };
  }

  delete(id: string) {
    const position = this.alimentaciones.findIndex(
      (alimentacion) => alimentacion.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(
        `Alimentación con ID ${id} no encontrada`,
      );
    }
    this.alimentaciones.splice(position, 1);
    return {
      message: 'Alimentación eliminada con éxito',
    };
  }
}
