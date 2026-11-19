import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CitasController } from './citas.controller.js';
import { CitasService } from './citas.service.js';
import { EstadoCita } from './cita.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching app.controller.spec.ts.
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

      expect(mockService.findById).toHaveBeenCalledWith(citaId);
      expect(res.body).toEqual(response);
    });

    it('DELETE /citas/:id passes a valid UUID through', async () => {
      mockService.delete.mockResolvedValue({
        message: 'Cita eliminada con éxito',
      });

      await request(app.getHttpServer())
        .delete(`/citas/${citaId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledWith(citaId);
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
});
