import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHistoriaClinicaDto {
  @IsString()
  @IsNotEmpty()
  mascotaId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaConsulta: Date;

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
  fechaConsulta?: Date;

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
