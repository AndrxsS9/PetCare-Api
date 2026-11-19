import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../usuarios/usuario.dto.js';

export const ROLES_KEY = 'roles';

/** Restricts a route (or controller) to the given roles. Responds 403 otherwise. */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
