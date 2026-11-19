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
import {
  CreateHistoriaClinicaDto,
  UpdateHistoriaClinicaDto,
} from './historia-clinica.dto.js';
import { HistoriasClinicasService } from './historias-clinicas.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('historias-clinicas')
export class HistoriasClinicasController {
  constructor(private historiasClinicasService: HistoriasClinicasService) {}

  @Get()
  getHistoriasClinicas(@CurrentUser() user: AuthenticatedUser) {
    return this.historiasClinicasService.findAll(user);
  }

  @Get(':id')
  getHistoriaClinicaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.findById(id, user);
  }

  @Post()
  createHistoriaClinica(
    @Body() historiaPayload: CreateHistoriaClinicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.create(historiaPayload, user);
  }

  @Put(':id')
  updateHistoriaClinica(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() historiaChanges: UpdateHistoriaClinicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.update(id, historiaChanges, user);
  }

  @Delete(':id')
  deleteHistoriaClinica(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.delete(id, user);
  }
}
