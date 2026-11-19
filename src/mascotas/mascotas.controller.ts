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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiBadRequest,
  ApiBadUuid,
  ApiBadUuidOrBody,
  ApiDeletedResponse,
  EXAMPLE_ID,
  ApiForbidden,
  ApiJwtAuth,
  ApiMessageResponse,
  ApiNotFound,
  ApiUuidParam,
} from '../swagger/api-docs.decorators.js';
import { API_TAGS } from '../swagger/swagger.config.js';
import { MascotaDto } from '../swagger/schemas/mascota.schema.js';

@ApiTags(API_TAGS.mascotas)
@ApiJwtAuth()
@Controller('mascotas')
export class MascotasController {
  constructor(private mascotasService: MascotasService) {}

  @ApiOperation({
    summary: 'Listar mascotas',
    description: 'ADMIN obtiene todas las mascotas; DUENO y VETERINARIO solo las suyas.',
  })
  @ApiOkResponse({ description: 'Mascotas accesibles, con su dueño (sin contraseña).', type: [MascotaDto] })
  @Get()
  getMascotas(@CurrentUser() user: AuthenticatedUser) {
    return this.mascotasService.findAll(user);
  }

  @ApiOperation({
    summary: 'Obtener una mascota por id',
    description: 'Si la mascota no existe o pertenece a otro usuario se responde 404.',
  })
  @ApiUuidParam('Id de la mascota.')
  @ApiMessageResponse(200, MascotaDto, 'Mascota encontrada')
  @ApiBadUuid()
  @ApiNotFound('Mascota no encontrada o perteneciente a otro usuario.', [`Mascota con ID ${EXAMPLE_ID} no encontrada`])
  @Get(':id')
  getMascotaById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Registrar una mascota',
    description: 'Si se omite `usuarioId`, la mascota se asigna al usuario autenticado. Solo ADMIN puede registrar mascotas a nombre de otro usuario.',
  })
  @ApiMessageResponse(201, MascotaDto, 'Mascota creada con éxito')
  @ApiBadRequest()
  @ApiForbidden('Un usuario no ADMIN indicó un `usuarioId` distinto del suyo.', [
    'Solo puedes registrar mascotas a tu nombre',
  ])
  @ApiNotFound('El usuario indicado en `usuarioId` no existe.', [
    `El usuario con ID ${EXAMPLE_ID} no existe. No se puede asociar una mascota a un usuario inexistente`,
  ])
  @Post()
  createMascota(
    @Body() mascotaPayload: CreateMascotaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.create(mascotaPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar una mascota',
    description: 'Actualización parcial. Solo ADMIN puede transferir la mascota cambiando `usuarioId`. Si la mascota no existe o pertenece a otro usuario se responde 404.',
  })
  @ApiUuidParam('Id de la mascota.')
  @ApiMessageResponse(200, MascotaDto, 'Mascota actualizada con éxito')
  @ApiBadUuidOrBody()
  @ApiForbidden('Un usuario no ADMIN intentó transferir la mascota a otro dueño.', [
    'Solo un administrador puede transferir la propiedad de una mascota',
  ])
  @ApiNotFound('Mascota no encontrada, ajena, o usuario de destino inexistente.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
    `El usuario con ID ${EXAMPLE_ID} no existe. No se puede transferir una mascota a un usuario inexistente`,
  ])
  @Put(':id')
  updateMascota(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() mascotaChanges: UpdateMascotaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.update(id, mascotaChanges, user);
  }

  @ApiOperation({
    summary: 'Eliminar una mascota',
    description: 'Elimina también sus citas, historias clínicas, alimentación, vacunas y medicamentos (borrado en cascada).',
  })
  @ApiUuidParam('Id de la mascota.')
  @ApiDeletedResponse('Mascota eliminada con éxito')
  @ApiBadUuid()
  @ApiNotFound('Mascota no encontrada o perteneciente a otro usuario.', [`Mascota con ID ${EXAMPLE_ID} no encontrada`])
  @Delete(':id')
  deleteMascota(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mascotasService.delete(id, user);
  }
}
