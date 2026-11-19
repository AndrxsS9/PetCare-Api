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

/**
 * Authorization rules (all routes require a JWT through the global guard):
 * - List users: ADMIN or VETERINARIO.
 * - Read a user: ADMIN or VETERINARIO, or the user themselves.
 * - Create users with any role: ADMIN only (owners self-register via /auth/register).
 * - Update: ADMIN for anyone; other users only themselves and never `rol`/`estado`.
 * - Delete: ADMIN only.
 */
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.VETERINARIO)
  getUsuarios() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  getUsuarioById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const isStaff = user.rol === RolUsuario.ADMIN || user.rol === RolUsuario.VETERINARIO;
    if (!isStaff && user.id !== id) {
      throw new ForbiddenException('Solo puedes consultar tu propio usuario');
    }
    return this.usuariosService.findById(id);
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  createUsuario(@Body() usuarioPayload: CreateUsuarioDto) {
    return this.usuariosService.create(usuarioPayload);
  }

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

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  deleteUsuario(@Param('id') id: string) {
    return this.usuariosService.delete(id);
  }
}
