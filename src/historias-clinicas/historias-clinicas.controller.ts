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
import { HistoriaClinicaDto } from '../swagger/schemas/records.schema.js';

@ApiTags(API_TAGS.historias)
@ApiJwtAuth()
@Controller('historias-clinicas')
export class HistoriasClinicasController {
  constructor(private historiasClinicasService: HistoriasClinicasService) {}

  @ApiOperation({ summary: 'Listar historias clínicas', description: 'ADMIN obtiene todos los registros; DUENO y VETERINARIO solo los de sus propias mascotas.' })
  @ApiOkResponse({ description: 'Listado de historias clínicas accesibles.', type: [HistoriaClinicaDto] })
  @Get()
  getHistoriasClinicas(@CurrentUser() user: AuthenticatedUser) {
    return this.historiasClinicasService.findAll(user);
  }

  @ApiOperation({ summary: 'Obtener la historia clínica por id', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la historia clínica.')
  @ApiMessageResponse(200, HistoriaClinicaDto, 'Historia clínica encontrada')
  @ApiBadUuid()
  @ApiNotFound('Historia clínica no encontrada o perteneciente a una mascota ajena.', [`Historia clínica con ID ${EXAMPLE_ID} no encontrada`])
  @Get(':id')
  getHistoriaClinicaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Crear la historia clínica',
    description: 'La mascota indicada en `mascotaId` debe pertenecer al usuario autenticado (ADMIN puede usar cualquiera). El valor del cuerpo nunca concede permisos.',
  })
  @ApiMessageResponse(201, HistoriaClinicaDto, 'Historia clínica creada con éxito')
  @ApiBadRequest()
  @ApiNotFound('La mascota indicada no existe o no pertenece al usuario autenticado.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
  ])
  @Post()
  createHistoriaClinica(
    @Body() historiaPayload: CreateHistoriaClinicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.create(historiaPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar la historia clínica',
    description: 'Actualización parcial. `mascotaId` no se puede modificar (400). Si el registro no existe o pertenece a una mascota ajena se responde 404.',
  })
  @ApiUuidParam('Id de la historia clínica.')
  @ApiMessageResponse(200, HistoriaClinicaDto, 'Historia clínica actualizada con éxito')
  @ApiBadUuidOrBody()
  @ApiNotFound('Historia clínica no encontrada o perteneciente a una mascota ajena.', [`Historia clínica con ID ${EXAMPLE_ID} no encontrada`])
  @Put(':id')
  updateHistoriaClinica(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() historiaChanges: UpdateHistoriaClinicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.update(id, historiaChanges, user);
  }

  @ApiOperation({ summary: 'Eliminar la historia clínica', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la historia clínica.')
  @ApiDeletedResponse('Historia clínica eliminada con éxito')
  @ApiBadUuid()
  @ApiNotFound('Historia clínica no encontrada o perteneciente a una mascota ajena.', [`Historia clínica con ID ${EXAMPLE_ID} no encontrada`])
  @Delete(':id')
  deleteHistoriaClinica(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiasClinicasService.delete(id, user);
  }
}
