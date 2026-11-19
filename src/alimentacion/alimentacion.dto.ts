import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlimentacionDto {
  @ApiProperty({ description: 'Mascota propia (o cualquiera si eres ADMIN). Si no existe o no te pertenece: 404.', format: 'uuid', example: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b' })
  @IsUUID()
  @IsNotEmpty()
  mascotaId: string;

  @ApiProperty({ description: 'Tipo de alimento.', maxLength: 100, example: 'Concentrado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tipoAlimento: string;

  @ApiProperty({ description: 'Marca.', maxLength: 100, example: 'Marca Ejemplo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @ApiProperty({ description: 'Cantidad por porción (número positivo).', example: 250 })
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @ApiProperty({ description: 'Unidad de medida.', maxLength: 50, example: 'gramos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidad: string;

  @ApiProperty({ description: 'Frecuencia.', maxLength: 100, example: '2 veces al día' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  frecuencia: string;

  @ApiProperty({ description: 'Horario.', maxLength: 100, example: '08:00 y 18:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  horario: string;

  @ApiPropertyOptional({ description: 'Observaciones. Por defecto cadena vacía.', example: 'Dividir la porción en dos comidas' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class UpdateAlimentacionDto {
  @ApiPropertyOptional({ description: 'Tipo de alimento.', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  tipoAlimento?: string;

  @ApiPropertyOptional({ description: 'Marca.', maxLength: 100, example: 'Otra Marca' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({ description: 'Cantidad por porción (número positivo).', example: 300 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida.', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  unidad?: string;

  @ApiPropertyOptional({ description: 'Frecuencia.', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  frecuencia?: string;

  @ApiPropertyOptional({ description: 'Horario.', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  horario?: string;

  @ApiPropertyOptional({ description: 'Observaciones.' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
