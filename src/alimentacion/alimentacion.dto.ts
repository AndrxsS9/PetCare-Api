import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAlimentacionDto {
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @IsString()
  @IsNotEmpty()
  tipoAlimento: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsNumber()
  @IsPositive()
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
  @IsNotEmpty()
  @IsOptional()
  tipoAlimento?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  marca?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  unidad?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  frecuencia?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  horario?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
