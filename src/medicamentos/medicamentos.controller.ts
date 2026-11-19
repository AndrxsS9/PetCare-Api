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
import { MedicamentoDto } from '../swagger/schemas/records.schema.js';

@ApiTags(API_TAGS.medicamentos)
@ApiJwtAuth()
@Controller('medicamentos')
export class MedicamentosController {
  constructor(private medicamentosService: MedicamentosService) {}

  @ApiOperation({ summary: 'Listar medicamentos', description: 'ADMIN obtiene todos los registros; DUENO y VETERINARIO solo los de sus propias mascotas.' })
  @ApiOkResponse({ description: 'Listado de medicamentos accesibles.', type: [MedicamentoDto] })
  @Get()
  getMedicamentos(@CurrentUser() user: AuthenticatedUser) {
    return this.medicamentosService.findAll(user);
  }

  @ApiOperation({ summary: 'Obtener el medicamento por id', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de el medicamento.')
  @ApiMessageResponse(200, MedicamentoDto, 'Medicamento encontrado')
  @ApiBadUuid()
  @ApiNotFound('Medicamento no encontrado o perteneciente a una mascota ajena.', [`Medicamento con ID ${EXAMPLE_ID} no encontrado`])
  @Get(':id')
  getMedicamentoById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.findById(id, user);
  }

  @ApiOperation({
    summary: 'Crear el medicamento',
    description: 'La mascota indicada en `mascotaId` debe pertenecer al usuario autenticado (ADMIN puede usar cualquiera). El valor del cuerpo nunca concede permisos.',
  })
  @ApiMessageResponse(201, MedicamentoDto, 'Medicamento creado con éxito')
  @ApiBadRequest()
  @ApiNotFound('La mascota indicada no existe o no pertenece al usuario autenticado.', [
    `Mascota con ID ${EXAMPLE_ID} no encontrada`,
  ])
  @Post()
  createMedicamento(
    @Body() medicamentoPayload: CreateMedicamentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.create(medicamentoPayload, user);
  }

  @ApiOperation({
    summary: 'Actualizar el medicamento',
    description: 'Actualización parcial. `mascotaId` no se puede modificar (400). Si el registro no existe o pertenece a una mascota ajena se responde 404.',
  })
  @ApiUuidParam('Id de el medicamento.')
  @ApiMessageResponse(200, MedicamentoDto, 'Medicamento actualizado con éxito')
  @ApiBadUuidOrBody()
  @ApiNotFound('Medicamento no encontrado o perteneciente a una mascota ajena.', [`Medicamento con ID ${EXAMPLE_ID} no encontrado`])
  @Put(':id')
  updateMedicamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() medicamentoChanges: UpdateMedicamentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.update(id, medicamentoChanges, user);
  }

  @ApiOperation({ summary: 'Eliminar el medicamento', description: 'Si el registro no existe o pertenece a una mascota ajena se responde 404.' })
  @ApiUuidParam('Id de el medicamento.')
  @ApiDeletedResponse('Medicamento eliminado con éxito')
  @ApiBadUuid()
  @ApiNotFound('Medicamento no encontrado o perteneciente a una mascota ajena.', [`Medicamento con ID ${EXAMPLE_ID} no encontrado`])
  @Delete(':id')
  deleteMedicamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicamentosService.delete(id, user);
  }
}
