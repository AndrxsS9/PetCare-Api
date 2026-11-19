import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import { UsuariosService, UsuarioResponse } from '../usuarios/usuarios.service.js';
import type { AuthenticatedUser, JwtPayload } from './auth.types.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

export const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas';

export interface LoginResponse {
  message: string;
  data: {
    accessToken: string;
    tokenType: 'Bearer';
    usuario: UsuarioResponse;
  };
}

@Injectable()
export class AuthService {
  // Hash compared against when the email does not exist, so unknown users take
  // roughly as long as wrong passwords (mitigates user enumeration by timing).
  private dummyHash?: Promise<string>;

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto): Promise<{ message: string; data: UsuarioResponse }> {
    // Role and status are always decided server-side for public registration.
    const result = await this.usuariosService.create({
      nombre: payload.nombre,
      email: payload.email,
      password: payload.password,
      telefono: payload.telefono,
      rol: RolUsuario.DUENO,
      estado: true,
    });

    return { message: 'Usuario registrado con éxito', data: result.data };
  }

  async login(credentials: LoginDto): Promise<LoginResponse> {
    const usuario = await this.usuariosService.findByEmailForAuth(credentials.email);

    const passwordMatches = await bcrypt.compare(
      credentials.password,
      usuario?.password ?? (await this.getDummyHash()),
    );

    // Same 401 for unknown email, wrong password and inactive account.
    if (!usuario || !passwordMatches || !usuario.estado) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Inicio de sesión exitoso',
      data: {
        accessToken,
        tokenType: 'Bearer',
        usuario: this.usuariosService.sanitizeUser(usuario),
      },
    };
  }

  getProfile(user: AuthenticatedUser): { message: string; data: UsuarioResponse } {
    return { message: 'Perfil del usuario autenticado', data: user };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomBytes(32).toString('hex'), 10);
    return this.dummyHash;
  }
}
