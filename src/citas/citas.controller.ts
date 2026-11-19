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
import { CreateCitaDto, UpdateCitaDto } from './cita.dto.js';
import { CitasService } from './citas.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('citas')
export class CitasController {
  constructor(private citasService: CitasService) {}

  @Get()
  getCitas(@CurrentUser() user: AuthenticatedUser) {
    return this.citasService.findAll(user);
  }

  @Get(':id')
  getCitaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.findById(id, user);
  }

  @Post()
  createCita(
    @Body() citaPayload: CreateCitaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.create(citaPayload, user);
  }

  @Put(':id')
  updateCita(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() citaChanges: UpdateCitaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.update(id, citaChanges, user);
  }

  @Delete(':id')
  deleteCita(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.delete(id, user);
  }
}
