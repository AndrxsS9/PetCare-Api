import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Public self-registration. Deliberately has no `rol` or `estado` fields: the
 * global ValidationPipe (forbidNonWhitelisted) rejects them with 400, and the
 * service always assigns the DUENO role.
 */
export class RegisterDto {
  @ApiProperty({ description: 'Nombre completo.', maxLength: 100, example: 'María Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Correo electrónico único.', format: 'email', maxLength: 150, example: 'maria.perez@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @ApiProperty({ description: 'Contraseña de 6 a 72 caracteres.', minLength: 6, maxLength: 72, format: 'password', writeOnly: true, example: 'CambiaEsta123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  // bcrypt only uses the first 72 bytes of the input.
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres' })
  password: string;

  @ApiProperty({ description: 'Teléfono de contacto.', maxLength: 20, example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  telefono: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Correo electrónico registrado.', format: 'email', example: 'maria.perez@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña de la cuenta.', maxLength: 128, format: 'password', writeOnly: true, example: 'CambiaEsta123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
