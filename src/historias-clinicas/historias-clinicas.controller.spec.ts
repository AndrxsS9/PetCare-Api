import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { HistoriasClinicasController } from './historias-clinicas.controller.js';
import { HistoriasClinicasService } from './historias-clinicas.service.js';
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
describe('HistoriasClinicasController (HTTP)', () => {
  let app: INestApplication;

  const baseUrl = '/historias-clinicas';
  const historiaId = '7d2c5e9a-1b4f-4c3d-8e6a-2f9b0c7d5e33';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const validPayload = {
    mascotaId,
    fechaConsulta: '2026-11-18T10:00:00.000Z',
    diagnostico: 'Otitis externa leve en oído derecho',
    observaciones: 'Limpieza ótica cada 12 horas durante 7 días',
    pesoRegistrado: 12.4,
    veterinarioResponsable: 'Dra. Ana Ruiz',
  };

  const storedHistoria = { id: historiaId, ...validPayload };

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
      controllers: [HistoriasClinicasController],
      providers: [{ provide: HistoriasClinicasService, useValue: mockService }],
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

  describe('ParseUUIDPipe on :id', () => {
    it('GET /historias-clinicas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).get(`${baseUrl}/123`).expect(400);
      expect(mockService.findById).not.toHaveBeenCalled();
    });

    it('PUT /historias-clinicas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer())
        .put(`${baseUrl}/not-a-uuid`)
        .send({ diagnostico: 'Control de rutina' })
        .expect(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('DELETE /historias-clinicas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).delete(`${baseUrl}/abc`).expect(400);
      expect(mockService.delete).not.toHaveBeenCalled();
    });
  });

  describe('successful requests', () => {
    it('GET /historias-clinicas returns 200 with the list of records', async () => {
      mockService.findAll.mockResolvedValue([storedHistoria]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual([storedHistoria]);
    });

    it('GET /historias-clinicas/:id returns 200 with { message, data }', async () => {
      const response = {
        message: 'Historia clínica encontrada',
        data: storedHistoria,
      };
      mockService.findById.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${historiaId}`)
        .expect(200);

      expect(mockService.findById).toHaveBeenCalledWith(historiaId, adminUser);
      expect(res.body).toEqual(response);
    });

    it('POST /historias-clinicas returns 201 for a valid payload', async () => {
      const response = {
        message: 'Historia clínica creada con éxito',
        data: storedHistoria,
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

    it('PUT /historias-clinicas/:id returns 200 for a valid partial update', async () => {
      const changes = { diagnostico: 'Otitis resuelta', pesoRegistrado: 12.8 };
      const response = {
        message: 'Historia clínica actualizada con éxito',
        data: { ...storedHistoria, ...changes },
      };
      mockService.update.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${historiaId}`)
        .send(changes)
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(
        historiaId,
        expect.objectContaining(changes),
        adminUser,
      );
      expect(res.body).toEqual(response);
    });

    it('DELETE /historias-clinicas/:id returns 200', async () => {
      const response = { message: 'Historia clínica eliminada con éxito' };
      mockService.delete.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${historiaId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledWith(historiaId, adminUser);
      expect(res.body).toEqual(response);
    });
  });

  describe('404 handling for nonexistent resources', () => {
    const historiaNotFound = `Historia clínica con ID ${historiaId} no encontrada`;
    const notFoundBody = (message: string) => ({
      statusCode: 404,
      message,
      error: 'Not Found',
    });

    it('GET /historias-clinicas/:id returns 404 when the record does not exist', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(historiaNotFound),
      );

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${historiaId}`)
        .expect(404);

      expect(mockService.findById).toHaveBeenCalledWith(historiaId, adminUser);
      expect(res.body).toEqual(notFoundBody(historiaNotFound));
    });

    it('PUT /historias-clinicas/:id returns 404 when the record does not exist', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(historiaNotFound),
      );

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${historiaId}`)
        .send({ diagnostico: 'Control de rutina' })
        .expect(404);

      expect(mockService.update).toHaveBeenCalledWith(
        historiaId,
        expect.objectContaining({ diagnostico: 'Control de rutina' }),
        adminUser,
      );
      expect(res.body).toEqual(notFoundBody(historiaNotFound));
    });

    it('DELETE /historias-clinicas/:id returns 404 when the record does not exist', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(historiaNotFound),
      );

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${historiaId}`)
        .expect(404);

      expect(mockService.delete).toHaveBeenCalledWith(historiaId, adminUser);
      expect(res.body).toEqual(notFoundBody(historiaNotFound));
    });

    it('POST /historias-clinicas returns 404 when the pet does not exist', async () => {
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

  describe('POST /historias-clinicas body validation', () => {
    it.each([
      ['mascotaId is missing', { mascotaId: undefined }],
      ['mascotaId is not a UUID', { mascotaId: '1' }],
      ['fechaConsulta is not an ISO date', { fechaConsulta: '18/11/2026' }],
      ['diagnostico is empty', { diagnostico: '' }],
      ['pesoRegistrado is zero', { pesoRegistrado: 0 }],
      ['pesoRegistrado is negative', { pesoRegistrado: -2.5 }],
      ['veterinarioResponsable is empty', { veterinarioResponsable: '' }],
      [
        'veterinarioResponsable exceeds 150 characters',
        { veterinarioResponsable: 'a'.repeat(151) },
      ],
      ['an unknown property is sent', { tratamiento: 'Antibiótico' }],
    ])('returns 400 when %s', async (_label, override) => {
      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send({ ...validPayload, ...override })
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /historias-clinicas/:id body validation', () => {
    it.each([
      ['fechaConsulta is not an ISO date', { fechaConsulta: 'mañana' }],
      ['diagnostico is empty', { diagnostico: '' }],
      ['pesoRegistrado is zero', { pesoRegistrado: 0 }],
      [
        'veterinarioResponsable exceeds 150 characters',
        { veterinarioResponsable: 'a'.repeat(151) },
      ],
      ['an unknown property is sent', { mascotaId }],
    ])('returns 400 when %s', async (_label, body) => {
      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${historiaId}`)
        .send(body)
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });
});
