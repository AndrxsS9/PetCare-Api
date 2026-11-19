import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../../usuarios/usuarios.service.js';
import { getJwtSecret, JWT_ALGORITHM } from '../jwt.config.js';
import type { AuthenticatedUser, JwtPayload } from '../auth.types.js';

/**
 * Verifies the Bearer token (signature, HS256 only, expiration) and then
 * reloads the user so deleted or deactivated accounts lose access at once.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
      algorithms: [JWT_ALGORITHM],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return null;
    }

    const usuario = await this.usuariosService.findSafeById(payload.sub);

    if (!usuario || !usuario.estado) {
      return null;
    }

    return usuario;
  }
}
