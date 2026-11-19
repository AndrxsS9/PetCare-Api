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
  CreateAlimentacionDto,
  UpdateAlimentacionDto,
} from './alimentacion.dto.js';
import { AlimentacionesService } from './alimentaciones.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Controller('alimentaciones')
export class AlimentacionController {
  constructor(private alimentacionesService: AlimentacionesService) {}

  @Get()
  getAlimentaciones(@CurrentUser() user: AuthenticatedUser) {
    return this.alimentacionesService.findAll(user);
  }

  @Get(':id')
  getAlimentacionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.findById(id, user);
  }

  @Post()
  createAlimentacion(
    @Body() alimentacionPayload: CreateAlimentacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.create(alimentacionPayload, user);
  }

  @Put(':id')
  updateAlimentacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() alimentacionChanges: UpdateAlimentacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.update(id, alimentacionChanges, user);
  }

  @Delete(':id')
  deleteAlimentacion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.delete(id, user);
  }
}
