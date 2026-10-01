import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import {
  CreateAlimentacionDto,
  UpdateAlimentacionDto,
} from './alimentacion.dto.js';
import { AlimentacionesService } from './alimentaciones.service.js';

@Controller('alimentaciones')
export class AlimentacionController {
  constructor(private alimentacionesService: AlimentacionesService) {}

  @Get()
  getAlimentaciones() {
    return this.alimentacionesService.findAll();
  }

  @Get(':id')
  getAlimentacionById(@Param('id') id: string) {
    return this.alimentacionesService.findById(id);
  }

  @Post()
  createAlimentacion(@Body() alimentacionPayload: CreateAlimentacionDto) {
    return this.alimentacionesService.create(alimentacionPayload);
  }

  @Put(':id')
  updateAlimentacion(
    @Param('id') id: string,
    @Body() alimentacionChanges: UpdateAlimentacionDto,
  ) {
    return this.alimentacionesService.update(id, alimentacionChanges);
  }

  @Delete(':id')
  deleteAlimentacion(@Param('id') id: string) {
    return this.alimentacionesService.delete(id);
  }
}
