import {
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
 */
const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/;
const ISO_CALENDAR_DATE_MESSAGE =
  '$property debe ser una fecha ISO 8601 en formato YYYY-MM-DD';

export class CreateVacunaDto {
  @ApiProperty({ description: 'Mascota propia (o cualquiera si eres ADMIN). Este módulo usa mascota_id (no mascotaId). Si no existe o no te pertenece: 404.', format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  @IsUUID()
  @IsNotEmpty()
  mascota_id: string;

  @ApiProperty({ description: 'Nombre de la vacuna.', maxLength: 150, example: 'Antirrábica' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreVacuna: string;

  @ApiProperty({ description: 'Fecha de aplicación. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date', example: '2026-01-10' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  fechaAplicacion: string;

  @ApiProperty({ description: 'Lote de la vacuna.', maxLength: 100, example: 'LOTE-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  loteVacuna: string;

  @ApiPropertyOptional({ description: 'Observaciones. Por defecto cadena vacía.', example: 'Sin reacciones adversas' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ description: 'Fecha de la próxima dosis. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date', example: '2027-01-10' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  proximaDosis: string;
}

// `id` and `mascota_id` are intentionally absent: the global ValidationPipe
// (whitelist + forbidNonWhitelisted) rejects them with HTTP 400.
export class UpdateVacunaDto {
  @ApiPropertyOptional({ description: 'Nombre de la vacuna.', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  nombreVacuna?: string;

  @ApiPropertyOptional({ description: 'Fecha de aplicación. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date', example: '2026-01-12' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  fechaAplicacion?: string;

  @ApiPropertyOptional({ description: 'Lote de la vacuna.', maxLength: 100, example: 'LOTE-2026-002' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  loteVacuna?: string;

  @ApiPropertyOptional({ description: 'Observaciones.' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Fecha de la próxima dosis. Fecha ISO 8601 que empieza por YYYY-MM-DD (se admite hora opcional; se guarda solo la fecha).', format: 'date' })
  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  proximaDosis?: string;
}
