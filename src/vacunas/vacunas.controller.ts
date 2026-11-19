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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiBadRequest,
  ApiBadUuid,
  ApiBadUuidOrBody,
  ApiDeletedResponse,
  EXAMPLE_ID,
  ApiJwtAuth,
  ApiMessageResponse,
  ApiNotFound,
  ApiUuidParam,
} from '../swagger/api-docs.decorators.js';
import { API_TAGS } from '../swagger/swagger.config.js';
import { VacunaDto } from '../swagger/schemas/records.schema.js';

@ApiTags(API_TAGS.vacunas)
@ApiJwtAuth()
@Controller('vacunas')
export class VacunasController {
  constructor(private vacunasService: VacunasService) {}

  @ApiOperation({ summary: 'Listar vacunas', description: 'ADMIN obtiene todos los registros; DUENO y VETERINARIO solo los de sus propias mascotas.' })
  @ApiOkResponse({ description: 'Listado de vacunas accesibles.', type: [VacunaDto] })
  @Get()
  getVacunas(@CurrentUser() user: AuthenticatedUser) {
    return this.vacunasService.findAll(user);
  }

  @ApiOperation({ summary: 'Obtener la vacuna por id', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la vacuna.')
  @ApiMessageResponse(200, VacunaDto, 'Vacuna encontrada')
  @ApiBadUuid()
  @ApiNotFound('Vacuna no encontrada o perteneciente a una mascota ajena.', [`Vacuna con ID ${EXAMPLE_ID} no encontrada`])
  @Get(':id')
  getVacunaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Crear la vacuna',
    description: 'La mascota indicada en `mascota_id` debe pertenecer al usuario autenticado (ADMIN puede usar cualquiera). El valor del cuerpo nunca concede permisos.',
  })
  @ApiMessageResponse(201, VacunaDto, 'Vacuna registrada con éxito')
  @ApiBadRequest()
  @ApiNotFound('La mascota indicada no existe o no pertenece al usuario autenticado.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
  ])
  @Post()
  createVacuna(
    @Body() vacunaPayload: CreateVacunaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.create(vacunaPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar la vacuna',
    description: 'Actualización parcial. `mascota_id` no se puede modificar (400). Si el registro no existe o pertenece a una mascota ajena se responde 404.',
  })
  @ApiUuidParam('Id de la vacuna.')
  @ApiMessageResponse(200, VacunaDto, 'Vacuna actualizada con éxito')
  @ApiBadUuidOrBody()
  @ApiNotFound('Vacuna no encontrada o perteneciente a una mascota ajena.', [`Vacuna con ID ${EXAMPLE_ID} no encontrada`])
  @Put(':id')
  updateVacuna(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() vacunaChanges: UpdateVacunaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.update(id, vacunaChanges, user);
  }

  @ApiOperation({ summary: 'Eliminar la vacuna', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la vacuna.')
  @ApiDeletedResponse('Vacuna eliminada con éxito')
  @ApiBadUuid()
  @ApiNotFound('Vacuna no encontrada o perteneciente a una mascota ajena.', [`Vacuna con ID ${EXAMPLE_ID} no encontrada`])
  @Delete(':id')
  deleteVacuna(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacunasService.delete(id, user);
  }
}
