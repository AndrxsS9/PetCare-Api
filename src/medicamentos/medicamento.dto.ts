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
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreMedicamento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosis: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frecuencia: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  inicio: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsNotEmpty()
  fin: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  // Defaults to true in the service when omitted.
  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

// `id` and `mascotaId` are intentionally absent: the global ValidationPipe
// (whitelist + forbidNonWhitelisted) rejects them with HTTP 400.
export class UpdateMedicamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  nombreMedicamento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  dosis?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  frecuencia?: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  inicio?: string;

  @IsDateString({ strict: true })
  @Matches(ISO_CALENDAR_DATE, { message: ISO_CALENDAR_DATE_MESSAGE })
  @IsOptional()
  fin?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
