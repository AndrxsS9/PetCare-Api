import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateUsuarioDto, RolUsuario, UpdateUsuarioDto } from './usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiBadRequest,
  ApiConflict,
  ApiDeletedResponse,
  EXAMPLE_ID,
  ApiForbidden,
  ApiJwtAuth,
  ApiMessageResponse,
  ApiNotFound,
} from '../swagger/api-docs.decorators.js';
import { API_TAGS } from '../swagger/swagger.config.js';
import { UsuarioConMascotasDto, UsuarioDto } from '../swagger/schemas/usuario.schema.js';

/**
 * Authorization rules (all routes require a JWT through the global guard):
 * - List users: ADMIN or VETERINARIO.
 * - Read a user: ADMIN or VETERINARIO, or the user themselves.
 * - Create users with any role: ADMIN only (owners self-register via /auth/register).
 * - Update: ADMIN for anyone; other users only themselves and never `rol`/`estado`.
 * - Delete: ADMIN only.
 */
@ApiTags(API_TAGS.usuarios)
@ApiJwtAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Listar usuarios', description: 'Solo ADMIN y VETERINARIO.' })
  @ApiOkResponse({ description: 'Listado de usuarios (sin contraseñas).', type: [UsuarioDto] })
  @ApiForbidden('El rol del usuario no es ADMIN ni VETERINARIO.')
  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.VETERINARIO)
  getUsuarios() {
    return this.usuariosService.findAll();
  }

  @ApiOperation({
    summary: 'Obtener un usuario por id',
    description: 'ADMIN y VETERINARIO pueden consultar cualquier usuario; DUENO solo a sí mismo. Incluye sus mascotas.',
  })
  @ApiParam({ name: 'id', description: 'Id del usuario.', format: 'uuid', type: String })
  @ApiMessageResponse(200, UsuarioConMascotasDto, 'Usuario encontrado')
  @ApiForbidden('Un DUENO intentó consultar a otro usuario.', [
    'Solo puedes consultar tu propio usuario',
  ])
  @ApiNotFound('Usuario no encontrado.', [`Usuario con ID ${EXAMPLE_ID} no encontrado`])
  @Get(':id')
  getUsuarioById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const isStaff = user.rol === RolUsuario.ADMIN || user.rol === RolUsuario.VETERINARIO;
    if (!isStaff && user.id !== id) {
      throw new ForbiddenException('Solo puedes consultar tu propio usuario');
    }
    return this.usuariosService.findById(id);
  }

  @ApiOperation({
    summary: 'Crear un usuario con cualquier rol',
    description: 'Solo ADMIN. Los dueños se registran con POST /auth/register.',
  })
  @ApiMessageResponse(201, UsuarioDto, 'Usuario creado con éxito')
  @ApiBadRequest()
  @ApiForbidden('El usuario autenticado no es ADMIN.')
  @ApiConflict('El correo electrónico ya se encuentra registrado.')
  @Post()
  @Roles(RolUsuario.ADMIN)
  createUsuario(@Body() usuarioPayload: CreateUsuarioDto) {
    return this.usuariosService.create(usuarioPayload);
  }

  @ApiOperation({
    summary: 'Actualizar un usuario',
    description: 'ADMIN puede modificar a cualquier usuario. Los demás solo a sí mismos y sin cambiar `rol` ni `estado`.',
  })
  @ApiParam({ name: 'id', description: 'Id del usuario.', format: 'uuid', type: String })
  @ApiMessageResponse(200, UsuarioDto, 'Usuario actualizado con éxito')
  @ApiBadRequest()
  @ApiForbidden('Modificar a otro usuario, o cambiar rol/estado sin ser ADMIN.', [
    'Solo puedes modificar tu propio usuario',
    'No tienes permisos para modificar el rol o el estado',
  ])
  @ApiNotFound('Usuario no encontrado.', [`Usuario con ID ${EXAMPLE_ID} no encontrado`])
  @ApiConflict('El nuevo correo electrónico ya se encuentra registrado.')
  @Put(':id')
  updateUsuario(
    @Param('id') id: string,
    @Body() usuarioChanges: UpdateUsuarioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.rol !== RolUsuario.ADMIN) {
      if (user.id !== id) {
        throw new ForbiddenException('Solo puedes modificar tu propio usuario');
      }
      if (usuarioChanges.rol !== undefined || usuarioChanges.estado !== undefined) {
        throw new ForbiddenException('No tienes permisos para modificar el rol o el estado');
      }
    }
    return this.usuariosService.update(id, usuarioChanges);
  }

  @ApiOperation({ summary: 'Eliminar un usuario', description: 'Solo ADMIN.' })
  @ApiParam({ name: 'id', description: 'Id del usuario.', format: 'uuid', type: String })
  @ApiDeletedResponse('Usuario eliminado con éxito')
  @ApiForbidden('El usuario autenticado no es ADMIN.')
  @ApiNotFound('Usuario no encontrado.', [`Usuario con ID ${EXAMPLE_ID} no encontrado`])
  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  deleteUsuario(@Param('id') id: string) {
    return this.usuariosService.delete(id);
  }
}
