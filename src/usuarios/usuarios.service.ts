import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { UsuarioEntity } from './usuario.entity.js';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto.js';

export type UsuarioResponse = Omit<UsuarioEntity, 'password'>;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepository: Repository<UsuarioEntity>,
  ) {}

  sanitizeUser(usuario: UsuarioEntity): UsuarioResponse {
    const { password: _, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  /**
   * Internal use by AuthService only: returns the full entity, INCLUDING the
   * password hash, so credentials can be verified. Never return it to clients.
   */
  async findByEmailForAuth(email: string): Promise<UsuarioEntity | null> {
    return this.usuarioRepository.findOne({ where: { email } });
  }

  /** Returns the user without the password hash, or null when it does not exist. */
  async findSafeById(id: string): Promise<UsuarioResponse | null> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    return usuario ? this.sanitizeUser(usuario) : null;
  }

  async findAll(): Promise<UsuarioResponse[]> {
    const usuarios = await this.usuarioRepository.find();
    return usuarios.map((u) => this.sanitizeUser(u));
  }

  async findById(id: string): Promise<{ message: string; data: UsuarioResponse }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: { mascotas: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return {
      message: 'Usuario encontrado',
      data: this.sanitizeUser(usuario),
    };
  }

  async findEntityById(id: string): Promise<UsuarioEntity> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return usuario;
  }

  async create(
    usuarioPayload: CreateUsuarioDto,
  ): Promise<{ message: string; data: UsuarioResponse }> {
    const existing = await this.usuarioRepository.findOne({
      where: { email: usuarioPayload.email },
    });

    if (existing) {
      throw new ConflictException(
        `El correo electrónico ${usuarioPayload.email} ya se encuentra registrado`,
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(usuarioPayload.password, saltRounds);

    const newUsuario = this.usuarioRepository.create({
      ...usuarioPayload,
      password: hashedPassword,
      estado: usuarioPayload.estado ?? true,
    });

    const savedUsuario = await this.usuarioRepository.save(newUsuario);

    return {
      message: 'Usuario creado con éxito',
      data: this.sanitizeUser(savedUsuario),
    };
  }

  async update(
    id: string,
    usuarioChanges: UpdateUsuarioDto,
  ): Promise<{ message: string; data: UsuarioResponse }> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (usuarioChanges.email && usuarioChanges.email !== usuario.email) {
      const existingEmail = await this.usuarioRepository.findOne({
        where: { email: usuarioChanges.email },
      });
      if (existingEmail) {
        throw new ConflictException(
          `El correo electrónico ${usuarioChanges.email} ya se encuentra registrado`,
        );
      }
    }

    if (usuarioChanges.password) {
      const saltRounds = 10;
      usuario.password = await bcrypt.hash(usuarioChanges.password, saltRounds);
    }

    if (usuarioChanges.nombre !== undefined) usuario.nombre = usuarioChanges.nombre;
    if (usuarioChanges.email !== undefined) usuario.email = usuarioChanges.email;
    if (usuarioChanges.telefono !== undefined) usuario.telefono = usuarioChanges.telefono;
    if (usuarioChanges.rol !== undefined) usuario.rol = usuarioChanges.rol;
    if (usuarioChanges.estado !== undefined) usuario.estado = usuarioChanges.estado;

    const updatedUsuario = await this.usuarioRepository.save(usuario);

    return {
      message: 'Usuario actualizado con éxito',
      data: this.sanitizeUser(updatedUsuario),
    };
  }

  async delete(id: string): Promise<{ message: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.usuarioRepository.remove(usuario);

    return {
      message: 'Usuario eliminado con éxito',
    };
  }
}
