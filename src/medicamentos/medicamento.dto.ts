import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMedicamentoDto {
  @IsString()
  @IsNotEmpty()
  mascotaId: string;

  @IsString()
  @IsNotEmpty()
  nombreMedicamento: string;

  @IsString()
  @IsNotEmpty()
  dosis: string;

  @IsString()
  @IsNotEmpty()
  frecuencia: string;

  @IsDateString()
  @IsNotEmpty()
  inicio: Date;

  @IsDateString()
  @IsNotEmpty()
  fin: Date;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

export class UpdateMedicamentoDto {
  @IsString()
  @IsOptional()
  nombreMedicamento?: string;

  @IsString()
  @IsOptional()
  dosis?: string;

  @IsString()
  @IsOptional()
  frecuencia?: string;

  @IsDateString()
  @IsOptional()
  inicio?: Date;

  @IsDateString()
  @IsOptional()
  fin?: Date;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
