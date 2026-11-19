import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import { UsuariosService } from '../../usuarios/usuarios.service.js';
import { RolUsuario } from '../../usuarios/usuario.dto.js';

const configWith = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('JwtStrategy', () => {
  const mockUsuariosService = { findSafeById: vi.fn() };
  const strategy = new JwtStrategy(
    configWith({ JWT_SECRET: 'strategy-test-only-Mn8bV7cX6zL5kJ4hG3fD2s' }),
    mockUsuariosService as unknown as UsuariosService,
  );

  const safeUser = {
    id: '7c6b5a49-3827-4615-9a0b-1c2d3e4f5a6b',
    nombre: 'Vet',
    email: 'vet@petcare.com',
    telefono: '3000000000',
    rol: RolUsuario.VETERINARIO,
    estado: true,
    mascotas: [],
  };

  beforeEach(() => vi.clearAllMocks());

  it('refuses to start without JWT_SECRET', () => {
    expect(
      () => new JwtStrategy(configWith({}), mockUsuariosService as unknown as UsuariosService),
    ).toThrow(/JWT_SECRET/);
  });

  it('returns the fresh user from the database for a valid payload', async () => {
    mockUsuariosService.findSafeById.mockResolvedValue(safeUser);

    const result = await strategy.validate({
      sub: safeUser.id,
      email: safeUser.email,
      // Role in the token is ignored; the database value is authoritative.
      rol: RolUsuario.ADMIN,
    });

    expect(mockUsuariosService.findSafeById).toHaveBeenCalledWith(safeUser.id);
    expect(result).toEqual(safeUser);
    expect(result?.rol).toBe(RolUsuario.VETERINARIO);
  });

  it('returns null when the user no longer exists', async () => {
    mockUsuariosService.findSafeById.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: safeUser.id, email: safeUser.email, rol: safeUser.rol }),
    ).resolves.toBeNull();
  });

  it('returns null when the user has been deactivated', async () => {
    mockUsuariosService.findSafeById.mockResolvedValue({ ...safeUser, estado: false });
    await expect(
      strategy.validate({ sub: safeUser.id, email: safeUser.email, rol: safeUser.rol }),
    ).resolves.toBeNull();
  });

  it('returns null for a payload without a subject', async () => {
    await expect(strategy.validate({} as never)).resolves.toBeNull();
    expect(mockUsuariosService.findSafeById).not.toHaveBeenCalled();
  });
});
