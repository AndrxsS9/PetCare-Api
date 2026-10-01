import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateMedicamentoDto, UpdateMedicamentoDto } from './medicamento.dto.js';
import { MedicamentosService } from './medicamentos.service.js';

@Controller('medicamentos')
export class MedicamentosController {
  constructor(private medicamentosService: MedicamentosService) {}

  @Get()
  getMedicamentos() {
    return this.medicamentosService.findAll();
  }

  @Get(':id')
  getMedicamentoById(@Param('id') id: string) {
    return this.medicamentosService.findById(id);
  }

  @Post()
  createMedicamento(@Body() medicamentoPayload: CreateMedicamentoDto) {
    return this.medicamentosService.create(medicamentoPayload);
  }

  @Put(':id')
  updateMedicamento(
    @Param('id') id: string,
    @Body() medicamentoChanges: UpdateMedicamentoDto,
  ) {
    return this.medicamentosService.update(id, medicamentoChanges);
  }

  @Delete(':id')
  deleteMedicamento(@Param('id') id: string) {
    return this.medicamentosService.delete(id);
  }
}
