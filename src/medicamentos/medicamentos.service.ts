import { Injectable, NotFoundException } from '@nestjs/common';
import { Medicamento } from './medicamento.model.js';
import { CreateMedicamentoDto, UpdateMedicamentoDto } from './medicamento.dto.js';

@Injectable()
export class MedicamentosService {
  private medicamentos: Medicamento[] = [
    {
      id: '1',
      mascotaId: '1',
      nombreMedicamento: 'Amoxicilina',
      dosis: '250 mg',
      frecuencia: 'Cada 12 horas',
      inicio: new Date('2024-06-10'),
      fin: new Date('2024-06-17'),
      observaciones: 'Administrar después de comer',
      estado: true,
    },
    {
      id: '2',
      mascotaId: '2',
      nombreMedicamento: 'Desparasitante',
      dosis: '1 tableta',
      frecuencia: 'Dosis única',
      inicio: new Date('2024-07-20'),
      fin: new Date('2024-07-20'),
      observaciones: '',
      estado: false,
    },
  ];

  findAll() {
    return this.medicamentos;
  }

  findById(id: string) {
    const data = this.medicamentos.find(
      (medicamento) => medicamento.id === id,
    );
    if (data === undefined) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }
    return {
      message: 'Medicamento encontrado',
      data,
    };
  }

  create(medicamentoPayload: CreateMedicamentoDto) {
    const newMedicamento: Medicamento = {
      ...medicamentoPayload,
      id: `${new Date().getTime()}`,
      observaciones: medicamentoPayload.observaciones ?? '',
      estado: medicamentoPayload.estado ?? true,
    };
    this.medicamentos.push(newMedicamento);
    return {
      message: 'Medicamento creado con éxito',
      data: newMedicamento,
    };
  }

  update(id: string, medicamentoChanges: UpdateMedicamentoDto) {
    const position = this.medicamentos.findIndex(
      (medicamento) => medicamento.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }
    const existingMedicamento = this.medicamentos[position];
    const updatedMedicamento = {
      ...existingMedicamento,
      ...medicamentoChanges,
    };
    this.medicamentos[position] = updatedMedicamento;
    return {
      message: 'Medicamento actualizado con éxito',
      data: updatedMedicamento,
    };
  }

  delete(id: string) {
    const position = this.medicamentos.findIndex(
      (medicamento) => medicamento.id === id,
    );
    if (position === -1) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }
    this.medicamentos.splice(position, 1);
    return {
      message: 'Medicamento eliminado con éxito',
    };
  }
}
