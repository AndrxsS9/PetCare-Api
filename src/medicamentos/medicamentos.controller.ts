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
  CreateMedicamentoDto,
  UpdateMedicamentoDto,
} from './medicamento.dto.js';
import { MedicamentosService } from './medicamentos.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('medicamentos')
export class MedicamentosController {
  constructor(private medicamentosService: MedicamentosService) {}

  @Get()
  getMedicamentos(@CurrentUser() user: AuthenticatedUser) {
    return this.medicamentosService.findAll(user);
  }

  @Get(':id')
  getMedicamentoById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.findById(id, user);
  }

  @Post()
  createMedicamento(
    @Body() medicamentoPayload: CreateMedicamentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.create(medicamentoPayload, user);
  }

  @Put(':id')
  updateMedicamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() medicamentoChanges: UpdateMedicamentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.update(id, medicamentoChanges, user);
  }

  @Delete(':id')
  deleteMedicamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.delete(id, user);
  }
}
