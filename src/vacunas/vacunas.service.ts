import { Injectable, NotFoundException } from '@nestjs/common';
import { Vacuna } from './vacuna.model.js';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';

@Injectable()
export class VacunasService {
  private vacunas: Vacuna[] = [
    {
      id: '1',
      mascota_id: '1',
      nombreVacuna: 'Rabia',
      fechaAplicacion: new Date('2024-01-10'),
      loteVacuna: 'LOT-2024-001',
      observaciones: 'Sin reacciones adversas',
      proximaDosis: new Date('2025-01-10'),
    },
    {
      id: '2',
      mascota_id: '1',
      nombreVacuna: 'Parvovirus',
      fechaAplicacion: new Date('2024-02-15'),
      loteVacuna: 'LOT-2024-022',
      observaciones: 'Aplicada sin inconvenientes',
      proximaDosis: new Date('2025-02-15'),
    },
    {
      id: '3',
      mascota_id: '2',
      nombreVacuna: 'Triple Felina',
      fechaAplicacion: new Date('2024-03-05'),
      loteVacuna: 'LOT-2024-045',
      observaciones: '',
      proximaDosis: new Date('2025-03-05'),
    },
  ];

  findAll() {
    return this.vacunas;
  }

  findById(id: string) {
    const data = this.vacunas.find((vacuna) => vacuna.id === id);
    if (data === undefined) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }
    return {
      message: 'Vacuna encontrada',
      data,
    };
  }

  create(vacunaPayload: CreateVacunaDto) {
    const newVacuna: Vacuna = {
      ...vacunaPayload,
      id: `${new Date().getTime()}`,
      observaciones: vacunaPayload.observaciones ?? '',
    };
    this.vacunas.push(newVacuna);
    return {
      message: 'Vacuna registrada con éxito',
      data: newVacuna,
    };
  }

  update(id: string, vacunaChanges: UpdateVacunaDto) {
    const position = this.vacunas.findIndex((vacuna) => vacuna.id === id);
    if (position === -1) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }
    const existingVacuna = this.vacunas[position];
    const updatedVacuna = { ...existingVacuna, ...vacunaChanges };
    this.vacunas[position] = updatedVacuna;
    return {
      message: 'Vacuna actualizada con éxito',
      data: updatedVacuna,
    };
  }

  delete(id: string) {
    const position = this.vacunas.findIndex((vacuna) => vacuna.id === id);
    if (position === -1) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }
    this.vacunas.splice(position, 1);
    return {
      message: 'Vacuna eliminada con éxito',
    };
  }
}
