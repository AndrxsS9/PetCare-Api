import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  CreateHistoriaClinicaDto,
  UpdateHistoriaClinicaDto,
} from './historia-clinica.dto.js';
import { HistoriasClinicasService } from './historias-clinicas.service.js';

@Controller('historias-clinicas')
export class HistoriasClinicasController {
  constructor(private historiasClinicasService: HistoriasClinicasService) {}

  @Get()
  getHistoriasClinicas() {
    return this.historiasClinicasService.findAll();
  }

  @Get(':id')
  getHistoriaClinicaById(@Param('id') id: string) {
    return this.historiasClinicasService.findById(id);
  }

  @Post()
  createHistoriaClinica(
    @Body() historiaPayload: CreateHistoriaClinicaDto,
  ) {
    return this.historiasClinicasService.create(historiaPayload);
  }

  @Put(':id')
  updateHistoriaClinica(
    @Param('id') id: string,
    @Body() historiaChanges: UpdateHistoriaClinicaDto,
  ) {
    return this.historiasClinicasService.update(id, historiaChanges);
  }

  @Delete(':id')
  deleteHistoriaClinica(@Param('id') id: string) {
    return this.historiasClinicasService.delete(id);
  }
}
