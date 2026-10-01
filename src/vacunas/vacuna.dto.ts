import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateVacunaDto {
  @IsString()
  @IsNotEmpty()
  mascota_id: string;

  @IsString()
  @IsNotEmpty()
  nombreVacuna: string;

  @IsDateString()
  @IsNotEmpty()
  fechaAplicacion: Date;

  @IsString()
  @IsNotEmpty()
  loteVacuna: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsDateString()
  @IsNotEmpty()
  proximaDosis: Date;
}

export class UpdateVacunaDto {
  @IsString()
  @IsOptional()
  nombreVacuna?: string;

  @IsDateString()
  @IsOptional()
  fechaAplicacion?: Date;

  @IsString()
  @IsOptional()
  loteVacuna?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsDateString()
  @IsOptional()
  proximaDosis?: Date;
}
