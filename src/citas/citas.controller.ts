import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateCitaDto, UpdateCitaDto } from './cita.dto.js';
import { CitasService } from './citas.service.js';

@Controller('citas')
export class CitasController {
  constructor(private citasService: CitasService) {}

  @Get()
  getCitas() {
    return this.citasService.findAll();
  }

  @Get(':id')
  getCitaById(@Param('id') id: string) {
    return this.citasService.findById(id);
  }

  @Post()
  createCita(@Body() citaPayload: CreateCitaDto) {
    return this.citasService.create(citaPayload);
  }

  @Put(':id')
  updateCita(@Param('id') id: string, @Body() citaChanges: UpdateCitaDto) {
    return this.citasService.update(id, citaChanges);
  }

  @Delete(':id')
  deleteCita(@Param('id') id: string) {
    return this.citasService.delete(id);
  }
}
