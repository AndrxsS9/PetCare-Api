import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum EstadoCita {
  PROGRAMADA = 'PROGRAMADA',
  REALIZADA = 'REALIZADA',
  CANCELADA = 'CANCELADA',
  REPORGRAMADA = 'REPROGRAMADA',
}

export class CreateCitaDto {
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaHora: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lugarveterinaria: string;

  @IsEnum(EstadoCita)
  @IsOptional()
  estado?: EstadoCita;
}

export class UpdateCitaDto {
  @IsDateString()
  @IsOptional()
  fechaHora?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  motivo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  lugarveterinaria?: string;

  @IsEnum(EstadoCita)
  @IsOptional()
  estado?: EstadoCita;
}
