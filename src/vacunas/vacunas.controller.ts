import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';
import { VacunasService } from './vacunas.service.js';

@Controller('vacunas')
export class VacunasController {
  constructor(private vacunasService: VacunasService) {}

  @Get()
  getVacunas() {
    return this.vacunasService.findAll();
  }

  @Get(':id')
  getVacunaById(@Param('id') id: string) {
    return this.vacunasService.findById(id);
  }

  @Post()
  createVacuna(@Body() vacunaPayload: CreateVacunaDto) {
    return this.vacunasService.create(vacunaPayload);
  }

  @Put(':id')
  updateVacuna(@Param('id') id: string, @Body() vacunaChanges: UpdateVacunaDto) {
    return this.vacunasService.update(id, vacunaChanges);
  }

  @Delete(':id')
  deleteVacuna(@Param('id') id: string) {
    return this.vacunasService.delete(id);
  }
}
