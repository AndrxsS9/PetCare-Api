import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Public self-registration. Deliberately has no `rol` or `estado` fields: the
 * global ValidationPipe (forbidNonWhitelisted) rejects them with 400, and the
 * service always assigns the DUENO role.
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  // bcrypt only uses the first 72 bytes of the input.
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  telefono: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
