import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsNotEmpty()
  pesoRegistrado: number;

  @IsString()
  @IsNotEmpty()
  veterinarioResponsable: string;
}

export class UpdateHistoriaClinicaDto {
  @IsDateString()
  @IsOptional()
  fechaConsulta?: string;

  @IsString()
  @IsOptional()
  diagnostico?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsOptional()
  pesoRegistrado?: number;

  @IsString()
  @IsOptional()
  veterinarioResponsable?: string;
}
