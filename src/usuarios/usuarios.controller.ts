import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  getUsuarios() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  getUsuarioById(@Param('id') id: string) {
    return this.usuariosService.findById(id);
  }

  @Post()
  createUsuario(@Body() usuarioPayload: CreateUsuarioDto) {
    return this.usuariosService.create(usuarioPayload);
  }

  @Put(':id')
  updateUsuario(@Param('id') id: string, @Body() usuarioChanges: UpdateUsuarioDto) {
    return this.usuariosService.update(id, usuarioChanges);
  }

  @Delete(':id')
  deleteUsuario(@Param('id') id: string) {
    return this.usuariosService.delete(id);
  }
}
