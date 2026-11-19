import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AlimentacionController } from './alimentacion.controller.js';
import { AlimentacionesService } from './alimentaciones.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';

// Same shape as the user the JWT strategy attaches to `request.user`. ADMIN is
// unrestricted by the ownership policy, so the original assertions still hold;
// ownership-restricted behavior is covered in src/auth/ownership*.spec.ts.
const adminUser: AuthenticatedUser = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  nombre: 'Admin',
  email: 'admin@petcare.com',
  telefono: '3000000000',
  rol: RolUsuario.ADMIN,
  estado: true,
  mascotas: [],
};

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.
describe('AlimentacionController (HTTP)', () => {
  let app: INestApplication;

  const baseUrl = '/alimentaciones';
  const alimentacionId = '5a1e7c2d-8f3b-4d6a-9c0e-3b2a1f4e6d77';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const validPayload = {
    mascotaId,
    tipoAlimento: 'Concentrado',
    marca: 'Royal Canin',
    cantidad: 250,
    unidad: 'gramos',
    frecuencia: '2 veces al día',
    horario: '08:00 y 18:00',
    observaciones: 'Dividir la porción en dos comidas',
  };

  const storedAlimentacion = { id: alimentacionId, ...validPayload };

  const mockService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlimentacionController],
      providers: [{ provide: AlimentacionesService, useValue: mockService }],
    }).compile();

    app = module.createNestApplication();
    // Stands in for the global JwtAuthGuard, which sets request.user.
    app.use((req: { user?: AuthenticatedUser }, _res: unknown, next: () => void) => {
      req.user = adminUser;
      next();
    });
    // Same options as the global pipe registered in main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('successful requests', () => {
    it('GET /alimentaciones returns 200 with the list of records', async () => {
      mockService.findAll.mockResolvedValue([storedAlimentacion]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual([storedAlimentacion]);
    });

    it('GET /alimentaciones/:id returns 200 with { message, data }', async () => {
      const response = {
        message: 'Alimentación encontrada',
        data: storedAlimentacion,
      };
      mockService.findById.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${alimentacionId}`)
        .expect(200);

      expect(mockService.findById).toHaveBeenCalledWith(alimentacionId, adminUser);
      expect(res.body).toEqual(response);
    });

    it('POST /alimentaciones returns 201 for a valid payload', async () => {
      const response = {
        message: 'Alimentación creada con éxito',
        data: storedAlimentacion,
      };
      mockService.create.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(validPayload)
        .expect(201);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining(validPayload),
        adminUser,
      );
      expect(res.body).toEqual(response);
    });

    it('PUT /alimentaciones/:id returns 200 for a valid update', async () => {
      const changes = { cantidad: 300, horario: '07:00 y 19:00' };
      const response = {
        message: 'Alimentación actualizada con éxito',
        data: { ...storedAlimentacion, ...changes },
      };
      mockService.update.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${alimentacionId}`)
        .send(changes)
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(
        alimentacionId,
        expect.objectContaining(changes),
        adminUser,
      );
      expect(res.body).toEqual(response);
    });

    it('DELETE /alimentaciones/:id returns 200', async () => {
      const response = { message: 'Alimentación eliminada con éxito' };
      mockService.delete.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${alimentacionId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledWith(alimentacionId, adminUser);
      expect(res.body).toEqual(response);
    });
  });

  describe('ParseUUIDPipe on :id', () => {
    it('GET /alimentaciones/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).get(`${baseUrl}/123`).expect(400);
      expect(mockService.findById).not.toHaveBeenCalled();
    });

    it('PUT /alimentaciones/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer())
        .put(`${baseUrl}/not-a-uuid`)
        .send({ cantidad: 300 })
        .expect(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('DELETE /alimentaciones/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).delete(`${baseUrl}/abc`).expect(400);
      expect(mockService.delete).not.toHaveBeenCalled();
    });
  });

  describe('404 handling for nonexistent resources', () => {
    const alimentacionNotFound = `Alimentación con ID ${alimentacionId} no encontrada`;
    const notFoundBody = (message: string) => ({
      statusCode: 404,
      message,
      error: 'Not Found',
    });

    it('GET /alimentaciones/:id returns 404 when the record does not exist', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(alimentacionNotFound),
      );

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${alimentacionId}`)
        .expect(404);

      expect(mockService.findById).toHaveBeenCalledWith(alimentacionId, adminUser);
      expect(res.body).toEqual(notFoundBody(alimentacionNotFound));
    });

    it('PUT /alimentaciones/:id returns 404 when the record does not exist', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(alimentacionNotFound),
      );

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${alimentacionId}`)
        .send({ cantidad: 300 })
        .expect(404);

      expect(mockService.update).toHaveBeenCalledWith(
        alimentacionId,
        expect.objectContaining({ cantidad: 300 }),
        adminUser,
      );
      expect(res.body).toEqual(notFoundBody(alimentacionNotFound));
    });

    it('DELETE /alimentaciones/:id returns 404 when the record does not exist', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(alimentacionNotFound),
      );

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${alimentacionId}`)
        .expect(404);

      expect(mockService.delete).toHaveBeenCalledWith(alimentacionId, adminUser);
      expect(res.body).toEqual(notFoundBody(alimentacionNotFound));
    });

    it('POST /alimentaciones returns 404 when the pet does not exist', async () => {
      const mascotaNotFound = `Mascota con ID ${mascotaId} no encontrada`;
      mockService.create.mockRejectedValue(
        new NotFoundException(mascotaNotFound),
      );

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(validPayload)
        .expect(404);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining(validPayload),
        adminUser,
      );
      expect(res.body).toEqual(notFoundBody(mascotaNotFound));
    });
  });

  describe('POST /alimentaciones body validation', () => {
    it.each([
      ['mascotaId is missing', { mascotaId: undefined }],
      ['mascotaId is not a UUID', { mascotaId: '1' }],
      ['tipoAlimento is empty', { tipoAlimento: '' }],
      ['marca is empty', { marca: '' }],
      ['unidad is empty', { unidad: '' }],
      ['frecuencia is empty', { frecuencia: '' }],
      ['horario is empty', { horario: '' }],
      ['tipoAlimento exceeds 100 characters', { tipoAlimento: 'a'.repeat(101) }],
      ['unidad exceeds 50 characters', { unidad: 'a'.repeat(51) }],
      ['cantidad is zero', { cantidad: 0 }],
      ['cantidad is negative', { cantidad: -10 }],
      ['cantidad is a string', { cantidad: '250' }],
      ['an unknown property is sent', { calorias: 350 }],
    ])('returns 400 when %s', async (_label, override) => {
      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send({ ...validPayload, ...override })
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /alimentaciones/:id body validation', () => {
    it.each([
      ['marca is empty', { marca: '' }],
      ['horario is empty', { horario: '' }],
      ['frecuencia exceeds 100 characters', { frecuencia: 'a'.repeat(101) }],
      ['unidad exceeds 50 characters', { unidad: 'a'.repeat(51) }],
      ['cantidad is zero', { cantidad: 0 }],
      ['cantidad is negative', { cantidad: -5 }],
      ['an unknown property is sent', { calorias: 350 }],
      ['mascotaId is sent (not supported on update)', { mascotaId }],
    ])('returns 400 when %s', async (_label, body) => {
      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${alimentacionId}`)
        .send(body)
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('valid optional fields', () => {
    it.each([
      ['omitted', undefined],
      ['an empty string', ''],
    ])('POST accepts observaciones when %s', async (_label, observaciones) => {
      mockService.create.mockResolvedValue({
        message: 'Alimentación creada con éxito',
        data: { ...storedAlimentacion, observaciones: '' },
      });

      await request(app.getHttpServer())
        .post(baseUrl)
        .send({ ...validPayload, observaciones })
        .expect(201);

      expect(mockService.create).toHaveBeenCalledTimes(1);
    });

    it('PUT accepts a partial update with a single field', async () => {
      mockService.update.mockResolvedValue({
        message: 'Alimentación actualizada con éxito',
        data: { ...storedAlimentacion, marca: 'Purina' },
      });

      await request(app.getHttpServer())
        .put(`${baseUrl}/${alimentacionId}`)
        .send({ marca: 'Purina' })
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(
        alimentacionId,
        expect.objectContaining({ marca: 'Purina' }),
        adminUser,
      );
    });
  });
});
