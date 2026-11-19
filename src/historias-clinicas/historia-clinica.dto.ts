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

export class CreateHistoriaClinicaDto {
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaConsulta: string;

  @IsString()
  @IsNotEmpty()
  diagnostico: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsPositive()
  pesoRegistrado: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  veterinarioResponsable: string;
}

export class UpdateHistoriaClinicaDto {
  @IsDateString()
  @IsOptional()
  fechaConsulta?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  diagnostico?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  pesoRegistrado?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @IsOptional()
  veterinarioResponsable?: string;
}
