import { Injectable, NotFoundException } from '@nestjs/common';
import { Cita } from './cita.model.js';
import { CreateCitaDto, UpdateCitaDto } from './cita.dto.js';

@Injectable()
export class CitasService {
  private citas: Cita[] = [
    {
      id: '1',
      mascotaId: '1',
      fechaHora: new Date('2024-06-10T10:00:00'),
      motivo: 'Control anual',
      lugarveterinaria: 'Clínica Veterinaria Paws',
      estado: 'REALIZADA',
    },
    {
      id: '2',
      mascotaId: '2',
      fechaHora: new Date('2024-07-20T14:30:00'),
      motivo: 'Vacunación',
      lugarveterinaria: 'Veterinaria Central',
      estado: 'PROGRAMADA',
    },
    {
      id: '3',
      mascotaId: '3',
      fechaHora: new Date('2024-07-25T09:00:00'),
      motivo: 'Revisión de piel',
      lugarveterinaria: 'Clínica Veterinaria Paws',
      estado: 'CANCELADA',
    },
  ];

  findAll() {
    return this.citas;
  }

  findById(id: string) {
    const data = this.citas.find((cita) => cita.id === id);
    if (data === undefined) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }
    return {
      message: 'Cita encontrada',
      data,
    };
  }

  create(citaPayload: CreateCitaDto) {
    const newCita: Cita = {
      ...citaPayload,
      id: `${new Date().getTime()}`,
      estado: citaPayload.estado ?? 'PROGRAMADA',
    };
    this.citas.push(newCita);
    return {
      message: 'Cita creada con éxito',
      data: newCita,
    };
  }

  update(id: string, citaChanges: UpdateCitaDto) {
    const position = this.citas.findIndex((cita) => cita.id === id);
    if (position === -1) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }
    const existingCita = this.citas[position];
    const updatedCita = { ...existingCita, ...citaChanges };
    this.citas[position] = updatedCita;
    return {
      message: 'Cita actualizada con éxito',
      data: updatedCita,
    };
  }

  delete(id: string) {
    const position = this.citas.findIndex((cita) => cita.id === id);
    if (position === -1) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }
    this.citas.splice(position, 1);
    return {
      message: 'Cita eliminada con éxito',
    };
  }
}
