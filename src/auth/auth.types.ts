import { RolUsuario } from '../usuarios/usuario.dto.js';
import type { UsuarioResponse } from '../usuarios/usuarios.service.js';

/** Claims stored inside the signed access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
}

/**
 * User attached to `request.user` after a token is validated. It is always
 * reloaded from the database, so role/estado changes take effect immediately
 * and it never contains the password hash.
 */
export type AuthenticatedUser = UsuarioResponse;
