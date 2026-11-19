import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CitasController } from './citas.controller.js';
import { CitasService } from './citas.service.js';
import { EstadoCita } from './cita.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching app.controller.spec.ts.
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

describe('CitasController (route validation)', () => {
  let app: INestApplication;

  const citaId = '7d2c5e9a-1b4f-4c3d-8e6a-2f9b0c7d5e33';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const validPayload = {
    mascotaId,
    fechaHora: '2026-12-01T10:00:00.000Z',
    motivo: 'Control anual',
    lugarveterinaria: 'Clínica Veterinaria Paws',
  };

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
      controllers: [CitasController],
      providers: [{ provide: CitasService, useValue: mockService }],
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
    it('GET /citas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).get('/citas/123').expect(400);
      expect(mockService.findById).not.toHaveBeenCalled();
    });

    it('PUT /citas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer())
        .put('/citas/not-a-uuid')
        .send({ motivo: 'Vacunación' })
        .expect(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('DELETE /citas/:id returns 400 for a malformed UUID', async () => {
      await request(app.getHttpServer()).delete('/citas/abc').expect(400);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('GET /citas/:id passes a valid UUID through and keeps the response format', async () => {
      const response = { message: 'Cita encontrada', data: { id: citaId } };
      mockService.findById.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .get(`/citas/${citaId}`)
        .expect(200);

      expect(mockService.findById).toHaveBeenCalledWith(citaId, adminUser);
      expect(res.body).toEqual(response);
    });

    it('DELETE /citas/:id passes a valid UUID through', async () => {
      mockService.delete.mockResolvedValue({
        message: 'Cita eliminada con éxito',
      });

      await request(app.getHttpServer())
        .delete(`/citas/${citaId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledWith(citaId, adminUser);
    });
  });

  describe('POST /citas body validation', () => {
    it('accepts a valid payload', async () => {
      mockService.create.mockResolvedValue({
        message: 'Cita creada con éxito',
        data: { id: citaId, ...validPayload },
      });

      await request(app.getHttpServer())
        .post('/citas')
        .send(validPayload)
        .expect(201);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining(validPayload),
        adminUser,
      );
    });

    it.each([
      ['mascotaId is not a UUID', { mascotaId: '1' }],
      ['mascotaId is missing', { mascotaId: undefined }],
      ['motivo is empty', { motivo: '' }],
      ['motivo exceeds 255 chars', { motivo: 'a'.repeat(256) }],
      ['lugarveterinaria is empty', { lugarveterinaria: '' }],
      ['lugarveterinaria exceeds 255 chars', { lugarveterinaria: 'a'.repeat(256) }],
      ['fechaHora is not an ISO date', { fechaHora: 'mañana' }],
      ['estado is not a valid EstadoCita', { estado: 'PENDIENTE' }],
      ['an unknown property is sent', { extra: true }],
    ])('returns 400 when %s', async (_label, override) => {
      await request(app.getHttpServer())
        .post('/citas')
        .send({ ...validPayload, ...override })
        .expect(400);

      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /citas/:id body validation', () => {
    it('accepts a partial update', async () => {
      mockService.update.mockResolvedValue({
        message: 'Cita actualizada con éxito',
        data: { id: citaId },
      });

      await request(app.getHttpServer())
        .put(`/citas/${citaId}`)
        .send({ estado: EstadoCita.REALIZADA })
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(
        citaId,
        expect.objectContaining({ estado: EstadoCita.REALIZADA }),
        adminUser,
      );
    });

    it.each([
      ['motivo is empty', { motivo: '' }],
      ['lugarveterinaria exceeds 255 chars', { lugarveterinaria: 'a'.repeat(256) }],
      ['fechaHora is not an ISO date', { fechaHora: '31/12/2026' }],
    ])('returns 400 when %s', async (_label, body) => {
      await request(app.getHttpServer())
        .put(`/citas/${citaId}`)
        .send(body)
        .expect(400);

      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('404 handling for nonexistent resources', () => {
    const citaNotFound = `Cita con ID ${citaId} no encontrada`;
    const notFoundBody = (message: string) => ({
      statusCode: 404,
      message,
      error: 'Not Found',
    });

    it('GET /citas/:id returns 404 when the appointment does not exist', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(citaNotFound),
      );

      const res = await request(app.getHttpServer())
        .get(`/citas/${citaId}`)
        .expect(404);

      expect(mockService.findById).toHaveBeenCalledWith(citaId, adminUser);
      expect(res.body).toEqual(notFoundBody(citaNotFound));
    });

    it('PUT /citas/:id returns 404 when the appointment does not exist', async () => {
      mockService.update.mockRejectedValue(new NotFoundException(citaNotFound));

      const res = await request(app.getHttpServer())
        .put(`/citas/${citaId}`)
        .send({ motivo: 'Revisión' })
        .expect(404);

      expect(mockService.update).toHaveBeenCalledWith(
        citaId,
        expect.objectContaining({ motivo: 'Revisión' }),
        adminUser,
      );
      expect(res.body).toEqual(notFoundBody(citaNotFound));
    });

    it('DELETE /citas/:id returns 404 when the appointment does not exist', async () => {
      mockService.delete.mockRejectedValue(new NotFoundException(citaNotFound));

      const res = await request(app.getHttpServer())
        .delete(`/citas/${citaId}`)
        .expect(404);

      expect(mockService.delete).toHaveBeenCalledWith(citaId, adminUser);
      expect(res.body).toEqual(notFoundBody(citaNotFound));
    });

    it('POST /citas returns 404 when the associated pet does not exist', async () => {
      const mascotaNotFound = `Mascota con ID ${mascotaId} no encontrada`;
      mockService.create.mockRejectedValue(
        new NotFoundException(mascotaNotFound),
      );

      const res = await request(app.getHttpServer())
        .post('/citas')
        .send(validPayload)
        .expect(404);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining(validPayload),
        adminUser,
      );
      expect(res.body).toEqual(notFoundBody(mascotaNotFound));
    });
  });
});
