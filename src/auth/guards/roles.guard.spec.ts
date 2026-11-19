import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { RolUsuario } from '../../usuarios/usuario.dto.js';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector & {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };
  const guard = new RolesGuard(reflector);

  const contextFor = (user?: { rol: RolUsuario }) =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => vi.clearAllMocks());

  it('allows routes without @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ rol: RolUsuario.DUENO }))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.ADMIN]);
    expect(guard.canActivate(contextFor({ rol: RolUsuario.ADMIN }))).toBe(true);
  });

  it('throws 403 for a user whose role is not listed', () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.ADMIN]);
    expect(() => guard.canActivate(contextFor({ rol: RolUsuario.DUENO }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws 403 when no user is present on a role-restricted route', () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.ADMIN]);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
