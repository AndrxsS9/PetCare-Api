import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export enum EspecieMascota {
  PERRO = 'PERRO',
  GATO = 'GATO',
  AVE = 'AVE',
  OTRO = 'OTRO',
}

export class CreateMascotaDto {
  @IsString()
  @IsNotEmpty()
  usuarioId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(EspecieMascota)
  @IsNotEmpty()
  especie: EspecieMascota;

  @IsString()
  @IsNotEmpty()
  raza: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_nacimiento: Date;

  @IsNumber()
  @IsNotEmpty()
  peso: number;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

export class UpdateMascotaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEnum(EspecieMascota)
  @IsOptional()
  especie?: EspecieMascota;

  @IsString()
  @IsOptional()
  raza?: string;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: Date;

  @IsNumber()
  @IsOptional()
  peso?: number;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
