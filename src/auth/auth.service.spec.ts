import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import type { UsuarioEntity } from '../usuarios/usuario.entity.js';
import type { JwtPayload } from './auth.types.js';

const TEST_SECRET = 'unit-test-only-Qw3rTy9uIo0pAs1dFg2hJk4lZx';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let storedUser: UsuarioEntity;

  const mockUsuariosService = {
    create: vi.fn(),
    findByEmailForAuth: vi.fn(),
    sanitizeUser: vi.fn((u: UsuarioEntity) => {
      const { password: _, ...safe } = u;
      return safe;
    }),
  };

  beforeAll(async () => {
    storedUser = {
      id: '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      nombre: 'Laura Dueña',
      email: 'laura@petcare.com',
      password: await bcrypt.hash('password123', 4),
      telefono: '3001234567',
      rol: RolUsuario.DUENO,
      estado: true,
      mascotas: [],
    };
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: mockUsuariosService },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: TEST_SECRET,
            signOptions: { algorithm: 'HS256', expiresIn: 3600 },
            verifyOptions: { algorithms: ['HS256'] },
          }),
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    const payload = {
      nombre: 'Nuevo Dueño',
      email: 'nuevo@petcare.com',
      password: 'password123',
      telefono: '3009876543',
    };

    it('creates the user through UsuariosService and returns it without password', async () => {
      const { password: _, ...safe } = { ...storedUser, ...payload };
      mockUsuariosService.create.mockResolvedValue({ message: 'Usuario creado con éxito', data: safe });

      const result = await service.register(payload);

      expect(result.message).toBe('Usuario registrado con éxito');
      expect(result.data).toEqual(safe);
      expect(result.data).not.toHaveProperty('password');
    });

    it('always assigns the DUENO role and active status server-side', async () => {
      mockUsuariosService.create.mockResolvedValue({ message: 'ok', data: {} });

      // Simulates a client trying to smuggle extra fields past the DTO type.
      await service.register({ ...payload, rol: RolUsuario.ADMIN, estado: false } as never);

      expect(mockUsuariosService.create).toHaveBeenCalledWith({
        ...payload,
        rol: RolUsuario.DUENO,
        estado: true,
      });
    });

    it('propagates the duplicate-email conflict from UsuariosService', async () => {
      mockUsuariosService.create.mockRejectedValue(
        new ConflictException('El correo electrónico nuevo@petcare.com ya se encuentra registrado'),
      );

      await expect(service.register(payload)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a signed HS256 token and the safe user for valid credentials', async () => {
      mockUsuariosService.findByEmailForAuth.mockResolvedValue(storedUser);

      const result = await service.login({ email: storedUser.email, password: 'password123' });

      expect(result.message).toBe('Inicio de sesión exitoso');
      expect(result.data.tokenType).toBe('Bearer');
      expect(result.data.usuario).not.toHaveProperty('password');
      expect(result.data.usuario.email).toBe(storedUser.email);
      expect(JSON.stringify(result)).not.toContain(storedUser.password);

      const decoded = jwtService.verify<JwtPayload & { iat: number; exp: number }>(
        result.data.accessToken,
      );
      expect(decoded.sub).toBe(storedUser.id);
      expect(decoded.email).toBe(storedUser.email);
      expect(decoded.rol).toBe(RolUsuario.DUENO);
      expect(decoded.exp - decoded.iat).toBe(3600);
      expect(decoded).not.toHaveProperty('password');

      const header = JSON.parse(
        Buffer.from(result.data.accessToken.split('.')[0], 'base64url').toString(),
      );
      expect(header.alg).toBe('HS256');
    });

    it('throws 401 for a wrong password', async () => {
      mockUsuariosService.findByEmailForAuth.mockResolvedValue(storedUser);

      await expect(
        service.login({ email: storedUser.email, password: 'wrong-password' }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
    });

    it('throws the same 401 for an unknown email and still runs bcrypt', async () => {
      mockUsuariosService.findByEmailForAuth.mockResolvedValue(null);
      const compareSpy = vi.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'nadie@petcare.com', password: 'password123' }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
      expect(compareSpy).toHaveBeenCalledTimes(1);

      compareSpy.mockRestore();
    });

    it('rejects inactive users even with the correct password', async () => {
      mockUsuariosService.findByEmailForAuth.mockResolvedValue({ ...storedUser, estado: false });

      await expect(
        service.login({ email: storedUser.email, password: 'password123' }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
    });
  });

  describe('getProfile', () => {
    it('wraps the authenticated user in the standard response', () => {
      const { password: _, ...safe } = storedUser;
      expect(service.getProfile(safe)).toEqual({
        message: 'Perfil del usuario autenticado',
        data: safe,
      });
    });
  });
});
