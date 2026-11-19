import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';
import { MascotasService } from './mascotas.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('mascotas')
export class MascotasController {
  constructor(private mascotasService: MascotasService) {}

  @Get()
  getMascotas(@CurrentUser() user: AuthenticatedUser) {
    return this.mascotasService.findAll(user);
  }

  @Get(':id')
  getMascotaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.findById(id, user);
  }

  @Post()
  createMascota(
    @Body() mascotaPayload: CreateMascotaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.create(mascotaPayload, user);
  }

  @Put(':id')
  updateMascota(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() mascotaChanges: UpdateMascotaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.update(id, mascotaChanges, user);
  }

  @Delete(':id')
  deleteMascota(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.delete(id, user);
  }
}
