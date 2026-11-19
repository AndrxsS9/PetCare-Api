import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAlimentacionDto {
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tipoAlimento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidad: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frecuencia: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  horario: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class UpdateAlimentacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  tipoAlimento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  marca?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  cantidad?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  unidad?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  frecuencia?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  horario?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
