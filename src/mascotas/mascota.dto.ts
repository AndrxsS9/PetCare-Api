import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EspecieMascota {
  PERRO = 'PERRO',
  GATO = 'GATO',
  AVE = 'AVE',
  OTRO = 'OTRO',
}

export class CreateMascotaDto {
  @ApiPropertyOptional({ description: 'Dueño de la mascota. Opcional: si se omite se usa el usuario autenticado. Solo ADMIN puede indicar otro usuario (403 en otro caso; 404 si no existe).', format: 'uuid', example: '6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f' })
  // Optional: defaults to the authenticated user. Only ADMIN may set another
  // owner; regular users get 403 if it differs from their own id.
  @IsUUID('all', { message: 'usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @ApiProperty({ description: 'Nombre de la mascota.', example: 'Firulais' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ description: 'Especie.', enum: EspecieMascota, enumName: 'EspecieMascota', example: EspecieMascota.PERRO })
  @IsEnum(EspecieMascota, { message: 'La especie debe ser PERRO, GATO, AVE u OTRO' })
  @IsNotEmpty({ message: 'La especie es obligatoria' })
  especie: EspecieMascota;

  @ApiProperty({ description: 'Raza.', example: 'Criollo' })
  @IsString({ message: 'La raza debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La raza es obligatoria' })
  raza: string;

  @ApiProperty({ description: 'Fecha de nacimiento (YYYY-MM-DD).', type: String, format: 'date', example: '2021-01-15' })
  @IsDateString({}, { message: 'fecha_nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  fecha_nacimiento: Date;

  @ApiProperty({ description: 'Peso en kilogramos (número positivo).', type: Number, example: 12.5 })
  @IsNumber({}, { message: 'El peso debe ser un número' })
  @IsPositive({ message: 'El peso debe ser un número positivo' })
  @IsNotEmpty({ message: 'El peso es obligatorio' })
  peso: number;

  @ApiPropertyOptional({ description: 'URL de la foto. Por defecto cadena vacía.', example: 'https://example.com/fotos/firulais.jpg' })
  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @ApiPropertyOptional({ description: 'Mascota activa. Por defecto true.', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

export class UpdateMascotaDto {
  @ApiPropertyOptional({ description: 'Transferir la mascota a otro dueño. Solo ADMIN (403 para otros usuarios; 404 si el destino no existe).', format: 'uuid' })
  @IsUUID('all', { message: 'usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Nombre de la mascota.', example: 'Firulais' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Especie.', enum: EspecieMascota, enumName: 'EspecieMascota' })
  @IsEnum(EspecieMascota, { message: 'La especie debe ser PERRO, GATO, AVE u OTRO' })
  @IsOptional()
  especie?: EspecieMascota;

  @ApiPropertyOptional({ description: 'Raza.', example: 'Labrador' })
  @IsString()
  @IsOptional()
  raza?: string;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento (YYYY-MM-DD).', type: String, format: 'date', example: '2021-01-15' })
  @IsDateString({}, { message: 'fecha_nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  fecha_nacimiento?: Date;

  @ApiPropertyOptional({ description: 'Peso en kilogramos (número positivo).', type: Number, example: 13.2 })
  @IsNumber({}, { message: 'El peso debe ser un número' })
  @IsPositive({ message: 'El peso debe ser un número positivo' })
  @IsOptional()
  peso?: number;

  @ApiPropertyOptional({ description: 'URL de la foto.' })
  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @ApiPropertyOptional({ description: 'Mascota activa.', example: true })
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
