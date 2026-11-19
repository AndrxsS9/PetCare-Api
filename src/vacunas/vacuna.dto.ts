import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * ISO 8601 strings must start with a calendar date (YYYY-MM-DD), optionally
 * followed by a time. This rules out ISO week/ordinal forms such as
 * `2024-W02` or `2024-010`, which cannot be mapped to a `date` column safely.
 */
const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/;
const ISO_CALENDAR_DATE_MESSAGE =
  '$property debe ser una fecha ISO 8601 en formato YYYY-MM-DD';

export class CreateVacunaDto {
  @IsUUID()
  @IsNotEmpty()
  mascota_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreVacuna: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  fechaAplicacion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  loteVacuna: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  proximaDosis: string;
}

// `id` and `mascota_id` are intentionally absent: the global ValidationPipe
// (whitelist + forbidNonWhitelisted) rejects them with HTTP 400.
export class UpdateVacunaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  nombreVacuna?: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  fechaAplicacion?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  loteVacuna?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  proximaDosis?: string;
}
