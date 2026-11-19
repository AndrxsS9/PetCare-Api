import { ConflictException, Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { MascotasController } from '../mascotas/mascotas.controller.js';
import { MascotasService } from '../mascotas/mascotas.service.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import type { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { UsuariosController } from '../usuarios/usuarios.controller.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { jwtModuleAsyncOptions } from './jwt.config.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

// Test-only key. Never used outside this spec.
const TEST_SECRET = 'http-test-only-key-9fK2mQ7xL4vB8nR1tY6wZ3cH';
const UNAUTHORIZED_MESSAGE = 'Token de acceso inválido, expirado o ausente';

// Global stub (like ConfigModule.forRoot({ isGlobal: true })) so that a
// JWT_SECRET from the developer's environment or .env cannot interfere.
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: { get: (key: string) => (key === 'JWT_SECRET' ? TEST_SECRET : undefined) },
    },
  ],
  exports: [ConfigService],
})
class TestConfigModule {}

/**
 * Wires the real AuthController, JwtStrategy, JwtModule and both global guards
 * exactly like AppModule, but with in-memory mocks instead of TypeORM so no
 * database connection is ever opened.
 */
describe('Auth (HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const users = new Map<string, UsuarioEntity>();

  const sanitize = (u: UsuarioEntity) => {
    const { password: _, ...safe } = u;
    return safe;
  };

  const mockUsuariosService = {
    sanitizeUser: vi.fn(sanitize),
    findByEmailForAuth: vi.fn(
      async (email: string) => [...users.values()].find((u) => u.email === email) ?? null,
    ),
    findSafeById: vi.fn(async (id: string) => {
      const u = users.get(id);
      return u ? sanitize(u) : null;
    }),
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockMascotasService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const ids = {
    dueno: '11111111-1111-4111-8111-111111111111',
    vet: '22222222-2222-4222-8222-222222222222',
    admin: '33333333-3333-4333-8333-333333333333',
    inactive: '44444444-4444-4444-8444-444444444444',
    other: '55555555-5555-4555-8555-555555555555',
  };
  const PASSWORD = 'password123';
  let passwordHash: string;

  const seed = () => {
    users.clear();
    const base = { password: passwordHash, telefono: '3000000000', estado: true, mascotas: [] };
    users.set(ids.dueno, { ...base, id: ids.dueno, nombre: 'Dueño', email: 'dueno@petcare.com', rol: RolUsuario.DUENO });
    users.set(ids.vet, { ...base, id: ids.vet, nombre: 'Vet', email: 'vet@petcare.com', rol: RolUsuario.VETERINARIO });
    users.set(ids.admin, { ...base, id: ids.admin, nombre: 'Admin', email: 'admin@petcare.com', rol: RolUsuario.ADMIN });
    users.set(ids.inactive, {
      ...base,
      id: ids.inactive,
      nombre: 'Inactivo',
      email: 'inactivo@petcare.com',
      rol: RolUsuario.DUENO,
      estado: false,
    });
  };

  const tokenFor = (id: string) => {
    const u = users.get(id)!;
    return jwtService.sign({ sub: u.id, email: u.email, rol: u.rol });
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    seed();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.registerAsync(jwtModuleAsyncOptions),
      ],
      controllers: [AppController, AuthController, UsuariosController, MascotasController],
      providers: [
        AppService,
        AuthService,
        JwtStrategy,
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: MascotasService, useValue: mockMascotasService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    jwtService = module.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('public routes', () => {
    it('GET / (health check) is reachable without a token', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);
      expect(res.text).toBe('PetCare API funcionando!');
    });
  });

  describe('POST /auth/register', () => {
    const payload = {
      nombre: 'Nuevo Dueño',
      email: 'nuevo@petcare.com',
      password: PASSWORD,
      telefono: '3009876543',
    };

    it('registers a user without a token and returns 201 without the password', async () => {
      mockUsuariosService.create.mockImplementation(async (dto) => ({
        message: 'Usuario creado con éxito',
        data: sanitize({ ...dto, id: ids.other, password: 'hash', mascotas: [] }),
      }));

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(payload)
        .expect(201);

      expect(res.body.message).toBe('Usuario registrado con éxito');
      expect(res.body.data.email).toBe(payload.email);
      expect(res.body.data.rol).toBe(RolUsuario.DUENO);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('assigns the DUENO role server-side', async () => {
      mockUsuariosService.create.mockResolvedValue({ message: 'ok', data: {} });

      await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);

      expect(mockUsuariosService.create).toHaveBeenCalledWith({
        ...payload,
        rol: RolUsuario.DUENO,
        estado: true,
      });
    });

    it.each([RolUsuario.ADMIN, RolUsuario.VETERINARIO])(
      'returns 400 when the client tries to choose the %s role',
      async (rol) => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ ...payload, rol })
          .expect(400);
        expect(mockUsuariosService.create).not.toHaveBeenCalled();
      },
    );

    it('returns 409 for a duplicate email', async () => {
      mockUsuariosService.create.mockRejectedValue(
        new ConflictException(`El correo electrónico ${payload.email} ya se encuentra registrado`),
      );

      await request(app.getHttpServer()).post('/auth/register').send(payload).expect(409);
    });

    it('returns 400 for an invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'no-es-correo', password: '1' })
        .expect(400);
      expect(mockUsuariosService.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with a valid access token and the safe user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dueno@petcare.com', password: PASSWORD })
        .expect(200);

      expect(res.body.message).toBe('Inicio de sesión exitoso');
      expect(res.body.data.tokenType).toBe('Bearer');
      expect(res.body.data.usuario.id).toBe(ids.dueno);
      expect(res.body.data.usuario).not.toHaveProperty('password');
      expect(res.text).not.toContain(passwordHash);

      const decoded = jwtService.verify(res.body.data.accessToken);
      expect(decoded.sub).toBe(ids.dueno);
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

    it('the issued token grants access to GET /auth/me', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'vet@petcare.com', password: PASSWORD })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(bearer(login.body.data.accessToken))
        .expect(200);

      expect(res.body.data.id).toBe(ids.vet);
    });

    it('returns 401 for a wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dueno@petcare.com', password: 'otra-clave' })
        .expect(401);
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('returns the same 401 for an unknown user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nadie@petcare.com', password: PASSWORD })
        .expect(401);
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('returns 401 for an inactive account', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactivo@petcare.com', password: PASSWORD })
        .expect(401);
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('returns 400 for a malformed body', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({ email: 'x' }).expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated profile without the password', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(bearer(tokenFor(ids.dueno)))
        .expect(200);

      expect(res.body).toEqual({
        message: 'Perfil del usuario autenticado',
        data: sanitize(users.get(ids.dueno)!),
      });
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('returns 401 without an Authorization header', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
      expect(res.body.message).toBe(UNAUTHORIZED_MESSAGE);
    });

    it.each([
      ['a non-Bearer scheme', `Basic ${Buffer.from('a:b').toString('base64')}`],
      ['an empty Bearer value', 'Bearer '],
      ['a non-JWT string', 'Bearer not-a-jwt'],
      ['a token without the scheme', 'eyJhbGciOiJIUzI1NiJ9.e30.x'],
    ])('returns 401 for a malformed header (%s)', async (_label, header) => {
      await request(app.getHttpServer()).get('/auth/me').set('Authorization', header).expect(401);
    });

    it('returns 401 for an expired token', async () => {
      const expired = new JwtService({ secret: TEST_SECRET }).sign({
        sub: ids.dueno,
        email: 'dueno@petcare.com',
        rol: RolUsuario.DUENO,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      await request(app.getHttpServer()).get('/auth/me').set(bearer(expired)).expect(401);
    });

    it('returns 401 for a token with a tampered payload', async () => {
      const [header, , signature] = tokenFor(ids.dueno).split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({ sub: ids.admin, email: 'admin@petcare.com', rol: RolUsuario.ADMIN }),
      ).toString('base64url');

      await request(app.getHttpServer())
        .get('/auth/me')
        .set(bearer(`${header}.${forgedPayload}.${signature}`))
        .expect(401);
    });

    it('returns 401 for a token with a tampered signature', async () => {
      const token = tokenFor(ids.dueno);
      const last = token.at(-2) === 'A' ? 'B' : 'A';
      const tampered = `${token.slice(0, -2)}${last}${token.at(-1)}`;

      await request(app.getHttpServer()).get('/auth/me').set(bearer(tampered)).expect(401);
    });

    it('returns 401 for a token signed with a different secret', async () => {
      const foreign = new JwtService({ secret: 'some-other-secret-ABCDEFGHIJKLMNOPQRSTUV' }).sign({
        sub: ids.admin,
        email: 'admin@petcare.com',
        rol: RolUsuario.ADMIN,
      });

      await request(app.getHttpServer()).get('/auth/me').set(bearer(foreign)).expect(401);
    });

    it('returns 401 for an unsigned token (alg "none")', async () => {
      const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const unsigned = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: ids.admin, rol: 'ADMIN' })}.`;

      await request(app.getHttpServer()).get('/auth/me').set(bearer(unsigned)).expect(401);
    });

    it('returns 401 for a token signed with a non-allowed algorithm (HS512)', async () => {
      const hs512 = new JwtService({ secret: TEST_SECRET }).sign(
        { sub: ids.dueno, email: 'dueno@petcare.com', rol: RolUsuario.DUENO },
        { algorithm: 'HS512' },
      );

      await request(app.getHttpServer()).get('/auth/me').set(bearer(hs512)).expect(401);
    });

    it('returns 401 when the user was deleted after the token was issued', async () => {
      const token = tokenFor(ids.dueno);
      users.delete(ids.dueno);

      await request(app.getHttpServer()).get('/auth/me').set(bearer(token)).expect(401);
    });

    it('returns 401 when the user was deactivated after the token was issued', async () => {
      const token = tokenFor(ids.dueno);
      users.get(ids.dueno)!.estado = false;

      await request(app.getHttpServer()).get('/auth/me').set(bearer(token)).expect(401);
    });
  });

  describe('protected CRUD endpoints', () => {
    it('GET /mascotas returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/mascotas').expect(401);
      expect(mockMascotasService.findAll).not.toHaveBeenCalled();
    });

    it('GET /mascotas returns 200 with a valid token', async () => {
      mockMascotasService.findAll.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/mascotas').set(bearer(tokenFor(ids.dueno))).expect(200);
      expect(mockMascotasService.findAll).toHaveBeenCalledTimes(1);
    });

    it('POST /mascotas returns 401 without a token before validating the body', async () => {
      await request(app.getHttpServer()).post('/mascotas').send({}).expect(401);
      expect(mockMascotasService.create).not.toHaveBeenCalled();
    });

    it.each([
      ['get', '/usuarios'],
      ['get', `/usuarios/${ids.dueno}`],
      ['post', '/usuarios'],
      ['put', `/usuarios/${ids.dueno}`],
      ['delete', `/usuarios/${ids.dueno}`],
    ] as const)('%s %s returns 401 without a token', async (method, url) => {
      await request(app.getHttpServer())[method](url).expect(401);
    });
  });

  describe('privilege escalation through /usuarios', () => {
    const adminPayload = {
      nombre: 'Intruso',
      email: 'intruso@petcare.com',
      password: PASSWORD,
      telefono: '3001231234',
      rol: RolUsuario.ADMIN,
    };

    it('a DUENO cannot create an ADMIN account (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/usuarios')
        .set(bearer(tokenFor(ids.dueno)))
        .send(adminPayload)
        .expect(403);
      expect(res.body.message).toBe('No tienes permisos para realizar esta acción');
      expect(mockUsuariosService.create).not.toHaveBeenCalled();
    });

    it('a VETERINARIO cannot create an ADMIN account (403)', async () => {
      await request(app.getHttpServer())
        .post('/usuarios')
        .set(bearer(tokenFor(ids.vet)))
        .send(adminPayload)
        .expect(403);
      expect(mockUsuariosService.create).not.toHaveBeenCalled();
    });

    it('an ADMIN can create accounts with any role (201)', async () => {
      mockUsuariosService.create.mockResolvedValue({ message: 'Usuario creado con éxito', data: {} });
      await request(app.getHttpServer())
        .post('/usuarios')
        .set(bearer(tokenFor(ids.admin)))
        .send(adminPayload)
        .expect(201);
      expect(mockUsuariosService.create).toHaveBeenCalledTimes(1);
    });

    it('a DUENO cannot promote themselves to ADMIN (403)', async () => {
      await request(app.getHttpServer())
        .put(`/usuarios/${ids.dueno}`)
        .set(bearer(tokenFor(ids.dueno)))
        .send({ rol: RolUsuario.ADMIN })
        .expect(403);
      expect(mockUsuariosService.update).not.toHaveBeenCalled();
    });

    it('a DUENO cannot reactivate or deactivate accounts via estado (403)', async () => {
      await request(app.getHttpServer())
        .put(`/usuarios/${ids.dueno}`)
        .set(bearer(tokenFor(ids.dueno)))
        .send({ estado: true })
        .expect(403);
      expect(mockUsuariosService.update).not.toHaveBeenCalled();
    });

    it('a DUENO cannot modify another user (403)', async () => {
      await request(app.getHttpServer())
        .put(`/usuarios/${ids.other}`)
        .set(bearer(tokenFor(ids.dueno)))
        .send({ nombre: 'Hackeado' })
        .expect(403);
      expect(mockUsuariosService.update).not.toHaveBeenCalled();
    });

    it('a DUENO can update their own basic data (200)', async () => {
      mockUsuariosService.update.mockResolvedValue({ message: 'Usuario actualizado con éxito', data: {} });
      await request(app.getHttpServer())
        .put(`/usuarios/${ids.dueno}`)
        .set(bearer(tokenFor(ids.dueno)))
        .send({ telefono: '3105556677' })
        .expect(200);
      expect(mockUsuariosService.update).toHaveBeenCalledWith(ids.dueno, { telefono: '3105556677' });
    });

    it('an ADMIN can change the role of another user (200)', async () => {
      mockUsuariosService.update.mockResolvedValue({ message: 'Usuario actualizado con éxito', data: {} });
      await request(app.getHttpServer())
        .put(`/usuarios/${ids.dueno}`)
        .set(bearer(tokenFor(ids.admin)))
        .send({ rol: RolUsuario.VETERINARIO })
        .expect(200);
    });

    it('a token whose role claim says ADMIN is ignored in favour of the database role', async () => {
      const forgedClaims = jwtService.sign({ sub: ids.dueno, email: 'dueno@petcare.com', rol: RolUsuario.ADMIN });
      await request(app.getHttpServer())
        .delete(`/usuarios/${ids.other}`)
        .set(bearer(forgedClaims))
        .expect(403);
      expect(mockUsuariosService.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['DUENO', ids.dueno],
      ['VETERINARIO', ids.vet],
    ])('a %s cannot delete accounts (403)', async (_rol, id) => {
      await request(app.getHttpServer())
        .delete(`/usuarios/${ids.other}`)
        .set(bearer(tokenFor(id)))
        .expect(403);
      expect(mockUsuariosService.delete).not.toHaveBeenCalled();
    });

    it('an ADMIN can delete accounts (200)', async () => {
      mockUsuariosService.delete.mockResolvedValue({ message: 'Usuario eliminado con éxito' });
      await request(app.getHttpServer())
        .delete(`/usuarios/${ids.other}`)
        .set(bearer(tokenFor(ids.admin)))
        .expect(200);
    });

    it('a DUENO cannot list all users (403)', async () => {
      await request(app.getHttpServer()).get('/usuarios').set(bearer(tokenFor(ids.dueno))).expect(403);
      expect(mockUsuariosService.findAll).not.toHaveBeenCalled();
    });

    it('a VETERINARIO can list users (200)', async () => {
      mockUsuariosService.findAll.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/usuarios').set(bearer(tokenFor(ids.vet))).expect(200);
    });

    it('a DUENO can read their own user but not another (200 / 403)', async () => {
      mockUsuariosService.findById.mockResolvedValue({ message: 'Usuario encontrado', data: {} });
      const token = tokenFor(ids.dueno);

      await request(app.getHttpServer()).get(`/usuarios/${ids.dueno}`).set(bearer(token)).expect(200);
      await request(app.getHttpServer()).get(`/usuarios/${ids.other}`).set(bearer(token)).expect(403);
      expect(mockUsuariosService.findById).toHaveBeenCalledTimes(1);
    });
  });
});
