import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EstadoCita {
  PROGRAMADA = 'PROGRAMADA',
  REALIZADA = 'REALIZADA',
  CANCELADA = 'CANCELADA',
  REPORGRAMADA = 'REPROGRAMADA',
}

export class CreateCitaDto {
  @ApiProperty({ description: 'Mascota propia (o cualquiera si eres ADMIN). Si no existe o no te pertenece: 404.', format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @ApiProperty({ description: 'Fecha y hora de la cita (ISO 8601).', format: 'date-time', example: '2026-12-01T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  fechaHora: string;

  @ApiProperty({ description: 'Motivo de la cita.', maxLength: 255, example: 'Control anual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;

  @ApiProperty({ description: 'Veterinaria o lugar de la cita.', maxLength: 255, example: 'Clínica Veterinaria Central' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lugarveterinaria: string;

  @ApiPropertyOptional({ description: 'Estado inicial. Por defecto PROGRAMADA.', enum: EstadoCita, enumName: 'EstadoCita', default: EstadoCita.PROGRAMADA })
  @IsEnum(EstadoCita)
  @IsOptional()
  estado?: EstadoCita;
}

export class UpdateCitaDto {
  @ApiPropertyOptional({ description: 'Nueva fecha y hora (ISO 8601).', format: 'date-time', example: '2026-12-02T15:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  fechaHora?: string;

  @ApiPropertyOptional({ description: 'Motivo de la cita.', maxLength: 255, example: 'Revisión' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ description: 'Veterinaria o lugar de la cita.', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  lugarveterinaria?: string;

  @ApiPropertyOptional({ description: 'Estado de la cita.', enum: EstadoCita, enumName: 'EstadoCita', example: EstadoCita.REALIZADA })
  @IsEnum(EstadoCita)
  @IsOptional()
  estado?: EstadoCita;
}
