import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsPositive,
} from 'class-validator';

export enum EspecieMascota {
  PERRO = 'PERRO',
  GATO = 'GATO',
  AVE = 'AVE',
  OTRO = 'OTRO',
}

export class CreateMascotaDto {
  // Optional: defaults to the authenticated user. Only ADMIN may set another
  // owner; regular users get 403 if it differs from their own id.
  @IsUUID('all', { message: 'usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsEnum(EspecieMascota, { message: 'La especie debe ser PERRO, GATO, AVE u OTRO' })
  @IsNotEmpty({ message: 'La especie es obligatoria' })
  especie: EspecieMascota;

  @IsString({ message: 'La raza debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La raza es obligatoria' })
  raza: string;

  @IsDateString({}, { message: 'fecha_nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  fecha_nacimiento: Date;

  @IsNumber({}, { message: 'El peso debe ser un número' })
  @IsPositive({ message: 'El peso debe ser un número positivo' })
  @IsNotEmpty({ message: 'El peso es obligatorio' })
  peso: number;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}

export class UpdateMascotaDto {
  @IsUUID('all', { message: 'usuarioId debe ser un UUID válido' })
  @IsOptional()
  usuarioId?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEnum(EspecieMascota, { message: 'La especie debe ser PERRO, GATO, AVE u OTRO' })
  @IsOptional()
  especie?: EspecieMascota;

  @IsString()
  @IsOptional()
  raza?: string;

  @IsDateString({}, { message: 'fecha_nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsOptional()
  fecha_nacimiento?: Date;

  @IsNumber({}, { message: 'El peso debe ser un número' })
  @IsPositive({ message: 'El peso debe ser un número positivo' })
  @IsOptional()
  peso?: number;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @IsBoolean()
  @IsOptional()
  estado?: boolean;
}
