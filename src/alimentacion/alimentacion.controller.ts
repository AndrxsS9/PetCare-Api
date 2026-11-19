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
import { AlimentacionDto } from '../swagger/schemas/records.schema.js';

@ApiTags(API_TAGS.alimentacion)
@ApiJwtAuth()
@Controller('alimentaciones')
export class AlimentacionController {
  constructor(private alimentacionesService: AlimentacionesService) {}

  @ApiOperation({ summary: 'Listar registros de alimentación', description: 'ADMIN obtiene todos los registros; DUENO y VETERINARIO solo los de sus propias mascotas.' })
  @ApiOkResponse({ description: 'Listado de registros de alimentación accesibles.', type: [AlimentacionDto] })
  @Get()
  getAlimentaciones(@CurrentUser() user: AuthenticatedUser) {
    return this.alimentacionesService.findAll(user);
  }

  @ApiOperation({ summary: 'Obtener la alimentación por id', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la alimentación.')
  @ApiMessageResponse(200, AlimentacionDto, 'Alimentación encontrada')
  @ApiBadUuid()
  @ApiNotFound('Alimentación no encontrada o perteneciente a una mascota ajena.', [`Alimentación con ID ${EXAMPLE_ID} no encontrada`])
  @Get(':id')
  getAlimentacionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Crear la alimentación',
    description: 'La mascota indicada en `mascotaId` debe pertenecer al usuario autenticado (ADMIN puede usar cualquiera). El valor del cuerpo nunca concede permisos.',
  })
  @ApiMessageResponse(201, AlimentacionDto, 'Alimentación creada con éxito')
  @ApiBadRequest()
  @ApiNotFound('La mascota indicada no existe o no pertenece al usuario autenticado.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
  ])
  @Post()
  createAlimentacion(
    @Body() alimentacionPayload: CreateAlimentacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.create(alimentacionPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar la alimentación',
    description: 'Actualización parcial. `mascotaId` no se puede modificar (400). Si el registro no existe o pertenece a una mascota ajena se responde 404.',
  })
  @ApiUuidParam('Id de la alimentación.')
  @ApiMessageResponse(200, AlimentacionDto, 'Alimentación actualizada con éxito')
  @ApiBadUuidOrBody()
  @ApiNotFound('Alimentación no encontrada o perteneciente a una mascota ajena.', [`Alimentación con ID ${EXAMPLE_ID} no encontrada`])
  @Put(':id')
  updateAlimentacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() alimentacionChanges: UpdateAlimentacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.update(id, alimentacionChanges, user);
  }

  @ApiOperation({ summary: 'Eliminar la alimentación', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de la alimentación.')
  @ApiDeletedResponse('Alimentación eliminada con éxito')
  @ApiBadUuid()
  @ApiNotFound('Alimentación no encontrada o perteneciente a una mascota ajena.', [`Alimentación con ID ${EXAMPLE_ID} no encontrada`])
  @Delete(':id')
  deleteAlimentacion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alimentacionesService.delete(id, user);
  }
}
