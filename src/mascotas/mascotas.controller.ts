import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';
import { MascotasService } from './mascotas.service.js';

@Controller('mascotas')
export class MascotasController {
  constructor(private mascotasService: MascotasService) {}

  @Get()
  getMascotas() {
    return this.mascotasService.findAll();
  }

  @Get(':id')
  getMascotaById(@Param('id') id: string) {
    return this.mascotasService.findById(id);
  }

  @Post()
  createMascota(@Body() mascotaPayload: CreateMascotaDto) {
    return this.mascotasService.create(mascotaPayload);
  }

  @Put(':id')
  updateMascota(@Param('id') id: string, @Body() mascotaChanges: UpdateMascotaDto) {
    return this.mascotasService.update(id, mascotaChanges);
  }

  @Delete(':id')
  deleteMascota(@Param('id') id: string) {
    return this.mascotasService.delete(id);
  }
}
