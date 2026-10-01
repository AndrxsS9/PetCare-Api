import { Injectable, NotFoundException } from '@nestjs/common';
import { HistoriaClinica } from './historia-clinica.model.js';
import {
  CreateHistoriaClinicaDto,
  UpdateHistoriaClinicaDto,
} from './historia-clinica.dto.js';

@Injectable()
export class HistoriasClinicasService {
  private historiasClinicas: HistoriaClinica[] = [
    {
      id: '1',
      mascotaId: '1',
      fechaConsulta: new Date('2024-06-10T10:00:00'),
      diagnostico: 'Buen estado general',
      observaciones: 'Continuar con alimentación actual',
      pesoRegistrado: 28.5,
      veterinarioResponsable: 'Dra. Ana Ruiz',
    },
    {
      id: '2',
      mascotaId: '2',
      fechaConsulta: new Date('2024-07-20T14:30:00'),
      diagnostico: 'Control de rutina',
      observaciones: '',
      pesoRegistrado: 4.2,
      veterinarioResponsable: 'Dra. Ana Ruiz',
    },
  ];

  findAll() {
    return this.historiasClinicas;
  }

  findById(id: string) {
    const data = this.historiasClinicas.find(
      (historia) => historia.id === id,
    );
    if (data === undefined) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }
    return {
      message: 'Historia clínica encontrada',
      data,
    };
  }

  create(historiaPayload: CreateHistoriaClinicaDto) {
    const newHistoria: HistoriaClinica = {
      ...historiaPayload,
      id: `${new Date().getTime()}`,
      observaciones: historiaPayload.observaciones ?? '',
    };
    this.historiasClinicas.push(newHistoria);
    return {
      message: 'Historia clínica creada con éxito',
      data: newHistoria,
    };
  }

  update(id: string, historiaChanges: UpdateHistoriaClinicaDto) {
    const position = this.historiasClinicas.findIndex(
      (historia) => historia.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }
    const existingHistoria = this.historiasClinicas[position];
    const updatedHistoria = { ...existingHistoria, ...historiaChanges };
    this.historiasClinicas[position] = updatedHistoria;
    return {
      message: 'Historia clínica actualizada con éxito',
      data: updatedHistoria,
    };
  }

  delete(id: string) {
    const position = this.historiasClinicas.findIndex(
      (historia) => historia.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(
        `Historia clínica con ID ${id} no encontrada`,
      );
    }
    this.historiasClinicas.splice(position, 1);
    return {
      message: 'Historia clínica eliminada con éxito',
    };
  }
}
