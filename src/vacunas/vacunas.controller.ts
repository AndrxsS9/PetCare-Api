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
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';
import { VacunasService } from './vacunas.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('vacunas')
export class VacunasController {
  constructor(private vacunasService: VacunasService) {}

  @Get()
  getVacunas(@CurrentUser() user: AuthenticatedUser) {
    return this.vacunasService.findAll(user);
  }

  @Get(':id')
  getVacunaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.findById(id, user);
  }

  @Post()
  createVacuna(
    @Body() vacunaPayload: CreateVacunaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.create(vacunaPayload, user);
  }

  @Put(':id')
  updateVacuna(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() vacunaChanges: UpdateVacunaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.update(id, vacunaChanges, user);
  }

  @Delete(':id')
  deleteVacuna(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.delete(id, user);
  }
}
