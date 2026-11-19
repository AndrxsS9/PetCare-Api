import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ISO 8601 strings must start with a calendar date (YYYY-MM-DD), optionally
 * followed by a time. This rules out ISO week/ordinal forms such as
 * `2024-W02` or `2024-010`, which cannot be mapped to a `date` column safely.
 * Combined with `IsDateString({ strict: true })`, impossible days such as
 * `2024-02-30` are rejected too.
 */
const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/;
const ISO_CALENDAR_DATE_MESSAGE =
  '$property debe ser una fecha ISO 8601 en formato YYYY-MM-DD';

export class CreateMedicamentoDto {
  @ApiProperty({ description: 'Mascota propia (o cualquiera si eres ADMIN). Si no existe o no te pertenece: 404.', format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @ApiProperty({ description: 'Nombre del medicamento.', maxLength: 150, example: 'Amoxicilina' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreMedicamento: string;

  @ApiProperty({ description: 'Dosis.', maxLength: 100, example: '1 tableta de 250 mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosis: string;

  @ApiProperty({ description: 'Frecuencia.', maxLength: 100, example: 'Cada 12 horas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frecuencia: string;

  @ApiProperty({ description: 'Inicio del tratamiento. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date', example: '2026-03-01' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  inicio: string;

  @ApiProperty({ description: 'Fin del tratamiento. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date', example: '2026-03-10' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  fin: string;

  @ApiPropertyOptional({ description: 'Observaciones. Por defecto cadena vacía.', example: 'Administrar con comida' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Tratamiento activo. Por defecto true.', default: true, example: true })
  // Defaults to true in the service when omitted.
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

// `id` and `mascotaId` are intentionally absent: the global ValidationPipe
// (whitelist + forbidNonWhitelisted) rejects them with HTTP 400.
export class UpdateMedicamentoDto {
  @ApiPropertyOptional({ description: 'Nombre del medicamento.', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  nombreMedicamento?: string;

  @ApiPropertyOptional({ description: 'Dosis.', maxLength: 100, example: '2 tabletas de 250 mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  dosis?: string;

  @ApiPropertyOptional({ description: 'Frecuencia.', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  frecuencia?: string;

  @ApiPropertyOptional({ description: 'Inicio del tratamiento. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  inicio?: string;

  @ApiPropertyOptional({ description: 'Fin del tratamiento. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  fin?: string;

  @ApiPropertyOptional({ description: 'Observaciones.' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Tratamiento activo.', example: false })
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
