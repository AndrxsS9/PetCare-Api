import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiBadRequest,
  ApiConflict,
  ApiInvalidCredentials,
  ApiJwtAuth,
  ApiMessageResponse,
} from '../swagger/api-docs.decorators.js';
import { API_TAGS } from '../swagger/swagger.config.js';
import { LoginDataDto, UsuarioDto } from '../swagger/schemas/usuario.schema.js';

@ApiTags(API_TAGS.auth)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Registrar un nuevo dueño (público)',
    description: 'Endpoint público. El rol siempre es DUENO: enviar `rol` o `estado` produce 400.',
  })
  @ApiMessageResponse(201, UsuarioDto, 'Usuario registrado con éxito')
  @ApiBadRequest('Datos inválidos o campos no permitidos (por ejemplo `rol`).')
  @ApiConflict('El correo electrónico ya se encuentra registrado.')
  @Public()
  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @ApiOperation({
    summary: 'Iniciar sesión (público)',
    description: 'Endpoint público. Devuelve el token JWT para usar en Authorize.',
  })
  @ApiMessageResponse(200, LoginDataDto, 'Inicio de sesión exitoso')
  @ApiBadRequest()
  @ApiInvalidCredentials()
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiJwtAuth()
  @ApiMessageResponse(200, UsuarioDto, 'Perfil del usuario autenticado')
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user);
  }
}
