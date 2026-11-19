import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHistoriaClinicaDto {
  @ApiProperty({ description: 'Mascota propia (o cualquiera si eres ADMIN). Si no existe o no te pertenece: 404.', format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @ApiProperty({ description: 'Fecha y hora de la consulta (ISO 8601).', format: 'date-time', example: '2026-11-01T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  fechaConsulta: string;

  @ApiProperty({ description: 'Diagnóstico.', example: 'Otitis externa leve' })
  @IsString()
  @IsNotEmpty()
  diagnostico: string;

  @ApiPropertyOptional({ description: 'Observaciones. Por defecto cadena vacía.', example: 'Limpieza diaria durante 7 días' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'Peso registrado en kilogramos (número positivo).', example: 12.3 })
  @IsNumber()
  @IsPositive()
  pesoRegistrado: number;

  @ApiProperty({ description: 'Veterinario responsable.', maxLength: 150, example: 'Dra. Laura Gómez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  veterinarioResponsable: string;
}

export class UpdateHistoriaClinicaDto {
  @ApiPropertyOptional({ description: 'Fecha y hora de la consulta (ISO 8601).', format: 'date-time' })
  @IsDateString()
  @IsOptional()
  fechaConsulta?: string;

  @ApiPropertyOptional({ description: 'Diagnóstico.', example: 'Otitis resuelta' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  diagnostico?: string;

  @ApiPropertyOptional({ description: 'Observaciones.' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Peso registrado en kilogramos (número positivo).', example: 12.1 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  pesoRegistrado?: number;

  @ApiPropertyOptional({ description: 'Veterinario responsable.', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  veterinarioResponsable?: string;
}
