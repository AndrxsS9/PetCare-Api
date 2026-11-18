import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EstadoCita {
  PROGRAMADA = 'PROGRAMADA',
  REALIZADA = 'REALIZADA',
  CANCELADA = 'CANCELADA',
  REPORGRAMADA = 'REPROGRAMADA',
}

export class CreateCitaDto {
  @IsString()
  @IsNotEmpty()
  mascotaId: string;

  @IsDateString()
  @IsNotEmpty()
  fechaHora: string;

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsString()
  @IsNotEmpty()
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
  @IsOptional()
  motivo?: string;

  @IsString()
  @IsOptional()
  lugarveterinaria?: string;

  @IsEnum(EstadoCita)
  @IsOptional()
  estado?: EstadoCita;
}
