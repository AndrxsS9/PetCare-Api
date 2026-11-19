import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RolUsuario {
  DUENO = 'DUENO',
  VETERINARIO = 'VETERINARIO',
  ADMIN = 'ADMIN',
}

export class CreateUsuarioDto {
  @ApiProperty({ description: 'Nombre completo.', example: 'María Pérez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Correo electrónico único.', format: 'email', example: 'maria.perez@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña (mínimo 6 caracteres). Se almacena cifrada y nunca se devuelve.', minLength: 6, format: 'password', writeOnly: true, example: 'CambiaEsta123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ description: 'Teléfono de contacto.', example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ description: 'Rol del nuevo usuario. Este endpoint es solo para ADMIN.', enum: RolUsuario, enumName: 'RolUsuario', example: RolUsuario.VETERINARIO })
  @IsEnum(RolUsuario)
  @IsNotEmpty()
  rol: RolUsuario;

  @ApiPropertyOptional({ description: 'Cuenta activa. Por defecto true.', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ description: 'Nombre completo.', example: 'María Pérez Gómez' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico único.', format: 'email', example: 'maria.nuevo@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Nueva contraseña (mínimo 6 caracteres).', minLength: 6, format: 'password', writeOnly: true, example: 'NuevaClave456' })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto.', example: '3109876543' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Solo ADMIN puede cambiar el rol (403 para otros usuarios).', enum: RolUsuario, enumName: 'RolUsuario' })
  @IsEnum(RolUsuario)
  @IsOptional()
  rol?: RolUsuario;

  @ApiPropertyOptional({ description: 'Solo ADMIN puede cambiar el estado (403 para otros usuarios).', example: true })
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
