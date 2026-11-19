import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '../../usuarios/usuario.dto.js';
import { EspecieMascota } from '../../mascotas/mascota.dto.js';

/**
 * Response shapes for users. The password hash is removed by the services
 * (UsuariosService.sanitizeUser) and is intentionally absent here.
 */
export class UsuarioDto {
  @ApiProperty({ format: 'uuid', example: '6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f' })
  id: string;

  @ApiProperty({ maxLength: 100, example: 'María Pérez' })
  nombre: string;

  @ApiProperty({ format: 'email', maxLength: 150, example: 'maria.perez@example.com' })
  email: string;

  @ApiProperty({ maxLength: 20, example: '3001234567' })
  telefono: string;

  @ApiProperty({ enum: RolUsuario, enumName: 'RolUsuario', example: RolUsuario.DUENO })
  rol: RolUsuario;

  @ApiProperty({ description: 'Indica si la cuenta está activa.', example: true })
  estado: boolean;
}

/** Pet as embedded in GET /usuarios/:id (without its owner). */
export class MascotaResumenDto {
  @ApiProperty({ format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  id: string;

  @ApiProperty({ format: 'uuid', example: '6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f' })
  usuarioId: string;

  @ApiProperty({ example: 'Firulais' })
  nombre: string;

  @ApiProperty({ enum: EspecieMascota, enumName: 'EspecieMascota', example: EspecieMascota.PERRO })
  especie: EspecieMascota;

  @ApiProperty({ example: 'Criollo' })
  raza: string;

  @ApiProperty({ type: String, format: 'date', example: '2021-01-15' })
  fecha_nacimiento: string;

  @ApiProperty({ description: 'Peso en kilogramos.', example: 12.5 })
  peso: number;

  @ApiProperty({ nullable: true, example: 'https://example.com/fotos/firulais.jpg' })
  fotoUrl: string;

  @ApiProperty({ example: true })
  estado: boolean;
}

export class UsuarioConMascotasDto extends UsuarioDto {
  @ApiProperty({ type: [MascotaResumenDto], description: 'Mascotas del usuario.' })
  mascotas: MascotaResumenDto[];
}

export class LoginDataDto {
  @ApiProperty({
    description: 'Token JWT de acceso. Úsalo en Authorize o en el encabezado Authorization: Bearer <token>.',
    example: '<token JWT>',
  })
  accessToken: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ type: UsuarioDto })
  usuario: UsuarioDto;
}
