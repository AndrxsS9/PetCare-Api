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
import { CitaDto } from '../swagger/schemas/records.schema.js';

@ApiTags(API_TAGS.citas)
@ApiJwtAuth()
@Controller('citas')
export class CitasController {
  constructor(private citasService: CitasService) {}

  @ApiOperation({ summary: 'Listar citas', description: 'ADMIN obtiene todos los registros; DUENO y VETERINARIO solo los de sus propias mascotas.' })
  @ApiOkResponse({ description: 'Listado de citas accesibles.', type: [CitaDto] })
  @Get()
  getCitas(@CurrentUser() user: AuthenticatedUser) {
    return this.citasService.findAll(user);
  }

  @ApiOperation({ summary: 'Obtener la cita por id', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la cita.')
  @ApiMessageResponse(200, CitaDto, 'Cita encontrada')
  @ApiBadUuid()
  @ApiNotFound('Cita no encontrada o perteneciente a una mascota ajena.', [`Cita con ID ${EXAMPLE_ID} no encontrada`])
  @Get(':id')
  getCitaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Crear la cita',
    description: 'La mascota indicada en `mascotaId` debe pertenecer al usuario autenticado (ADMIN puede usar cualquiera). El valor del cuerpo nunca concede permisos.',
  })
  @ApiMessageResponse(201, CitaDto, 'Cita creada con éxito')
  @ApiBadRequest()
  @ApiNotFound('La mascota indicada no existe o no pertenece al usuario autenticado.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
  ])
  @Post()
  createCita(
    @Body() citaPayload: CreateCitaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.create(citaPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar la cita',
    description: 'Actualización parcial. `mascotaId` no se puede modificar (400). Si el registro no existe o pertenece a una mascota ajena se responde 404.',
  })
  @ApiUuidParam('Id de la cita.')
  @ApiMessageResponse(200, CitaDto, 'Cita actualizada con éxito')
  @ApiBadUuidOrBody()
  @ApiNotFound('Cita no encontrada o perteneciente a una mascota ajena.', [`Cita con ID ${EXAMPLE_ID} no encontrada`])
  @Put(':id')
  updateCita(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() citaChanges: UpdateCitaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.update(id, citaChanges, user);
  }

  @ApiOperation({ summary: 'Eliminar la cita', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la cita.')
  @ApiDeletedResponse('Cita eliminada con éxito')
  @ApiBadUuid()
  @ApiNotFound('Cita no encontrada o perteneciente a una mascota ajena.', [`Cita con ID ${EXAMPLE_ID} no encontrada`])
  @Delete(':id')
  deleteCita(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.citasService.delete(id, user);
  }
}
