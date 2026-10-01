import { Injectable, NotFoundException } from '@nestjs/common';
import { Usuario } from './usuario.model.js';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto.js';

@Injectable()
export class UsuariosService {
  private usuarios: Usuario[] = [
    {
      id: '1',
      nombre: 'Carlos Pérez',
      email: 'carlos@correo.com',
      password: '123456',
      telefono: '3001234567',
      rol: 'DUENO',
      estado: true,
    },
    {
      id: '2',
      nombre: 'Dra. Ana Ruiz',
      email: 'ana@veterinaria.com',
      password: '123456',
      telefono: '3109876543',
      rol: 'VETERINARIO',
      estado: true,
    },
    {
      id: '3',
      nombre: 'Admin Sistema',
      email: 'admin@petcare.com',
      password: 'admin123',
      telefono: '3205551234',
      rol: 'ADMIN',
      estado: true,
    },
  ];

  findAll() {
    return this.usuarios;
  }

  findById(id: string) {
    const data = this.usuarios.find((usuario) => usuario.id === id);
    if (data === undefined) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return {
      message: 'Usuario encontrado',
      data,
    };
  }

  create(usuarioPayload: CreateUsuarioDto) {
    const newUsuario: Usuario = {
      ...usuarioPayload,
      id: `${new Date().getTime()}`,
      estado: usuarioPayload.estado ?? true,
    };
    this.usuarios.push(newUsuario);
    return {
      message: 'Usuario creado con éxito',
      data: newUsuario,
    };
  }

  update(id: string, usuarioChanges: UpdateUsuarioDto) {
    const position = this.usuarios.findIndex((usuario) => usuario.id === id);
    if (position === -1) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    const existingUsuario = this.usuarios[position];
    const updatedUsuario = { ...existingUsuario, ...usuarioChanges };
    this.usuarios[position] = updatedUsuario;
    return {
      message: 'Usuario actualizado con éxito',
      data: updatedUsuario,
    };
  }

  delete(id: string) {
    const position = this.usuarios.findIndex((usuario) => usuario.id === id);
    if (position === -1) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    this.usuarios.splice(position, 1);
    return {
      message: 'Usuario eliminado con éxito',
    };
  }
}
