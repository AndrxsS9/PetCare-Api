import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAlimentacionDto {
  @IsString()
  @IsNotEmpty()
  mascotaId: string;

  @IsString()
  @IsNotEmpty()
  tipoAlimento: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  unidad: string;

  @IsString()
  @IsNotEmpty()
  frecuencia: string;

  @IsString()
  @IsNotEmpty()
  horario: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class UpdateAlimentacionDto {
  @IsString()
  @IsOptional()
  tipoAlimento?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsOptional()
  unidad?: string;

  @IsString()
  @IsOptional()
  frecuencia?: string;

  @IsString()
  @IsOptional()
  horario?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
