import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { VacunasController } from './vacunas.controller.js';
import { VacunasService } from './vacunas.service.js';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.
describe('VacunasController (HTTP)', () => {
  let app: INestApplication;

  const baseUrl = '/vacunas';
  const vacunaId = '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c33';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const validPayload = {
    mascota_id: mascotaId,
    nombreVacuna: 'Rabia',
    fechaAplicacion: '2024-01-10',
    loteVacuna: 'LOT-2024-001',
    observaciones: 'Sin reacciones adversas',
    proximaDosis: '2025-01-10',
  };

  const storedVacuna = { id: vacunaId, ...validPayload };

  const mockService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const notFoundBody = (message: string) => ({
    statusCode: 404,
    message,
    error: 'Not Found',
  });

  const vacunaNotFound = `Vacuna con ID ${vacunaId} no encontrada`;
  const mascotaNotFound = `Mascota con ID ${mascotaId} no encontrada`;

  beforeEach(async () => {
    // Resets call history and any queued/implemented return values, so no
    // test depends on mock state left behind by another.
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VacunasController],
      providers: [{ provide: VacunasService, useValue: mockService }],
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

  describe('successful CRUD operations', () => {
    it('GET /vacunas returns 200 with the list of vaccinations', async () => {
      mockService.findAll.mockResolvedValue([storedVacuna]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(mockService.findAll).toHaveBeenCalledWith();
      expect(res.body).toEqual([storedVacuna]);
    });

    it('GET /vacunas returns 200 with an empty list', async () => {
      mockService.findAll.mockResolvedValue([]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(res.body).toEqual([]);
    });

    it('GET /vacunas/:id returns 200 and keeps the { message, data } format', async () => {
      const response = { message: 'Vacuna encontrada', data: storedVacuna };
      mockService.findById.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${vacunaId}`)
        .expect(200);

      expect(mockService.findById).toHaveBeenCalledTimes(1);
      expect(mockService.findById).toHaveBeenCalledWith(vacunaId);
      expect(res.body).toEqual(response);
    });

    it('POST /vacunas returns 201 for a valid vaccination', async () => {
      const response = {
        message: 'Vacuna registrada con éxito',
        data: storedVacuna,
      };
      mockService.create.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(validPayload)
        .expect(201);

      expect(mockService.create).toHaveBeenCalledTimes(1);
      const [dto] = mockService.create.mock.calls[0];
      expect(dto).toBeInstanceOf(CreateVacunaDto);
      expect(dto).toEqual(validPayload);
      expect(res.body).toEqual(response);
    });

    it('PUT /vacunas/:id returns 200 for a valid partial update', async () => {
      const changes = { loteVacuna: 'LOT-2024-099', proximaDosis: '2025-06-10' };
      const response = {
        message: 'Vacuna actualizada con éxito',
        data: { ...storedVacuna, ...changes },
      };
      mockService.update.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${vacunaId}`)
        .send(changes)
        .expect(200);

      expect(mockService.update).toHaveBeenCalledTimes(1);
      const [id, dto] = mockService.update.mock.calls[0];
      expect(id).toBe(vacunaId);
      expect(dto).toBeInstanceOf(UpdateVacunaDto);
      expect(dto).toEqual(changes);
      expect(res.body).toEqual(response);
    });

    it('DELETE /vacunas/:id returns 200', async () => {
      const response = { message: 'Vacuna eliminada con éxito' };
      mockService.delete.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${vacunaId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledTimes(1);
      expect(mockService.delete).toHaveBeenCalledWith(vacunaId);
      expect(res.body).toEqual(response);
    });
  });

  describe('ParseUUIDPipe on :id', () => {
    const malformedIds = [
      '123',
      'not-a-uuid',
      '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c3', // one character short
      '7c4d2e1a9b3f4a6e8d5c2f1e0a9b8c33', // missing hyphens
    ];

    it.each(malformedIds)(
      'GET /vacunas/%s returns 400 without calling the service',
      async (id) => {
        const res = await request(app.getHttpServer())
          .get(`${baseUrl}/${id}`)
          .expect(400);

        expect(res.body.statusCode).toBe(400);
        expect(mockService.findById).not.toHaveBeenCalled();
      },
    );

    it.each(malformedIds)(
      'PUT /vacunas/%s returns 400 without calling the service',
      async (id) => {
        await request(app.getHttpServer())
          .put(`${baseUrl}/${id}`)
          .send({ nombreVacuna: 'Moquillo' })
          .expect(400);

        expect(mockService.update).not.toHaveBeenCalled();
      },
    );

    it.each(malformedIds)(
      'DELETE /vacunas/%s returns 400 without calling the service',
      async (id) => {
        await request(app.getHttpServer())
          .delete(`${baseUrl}/${id}`)
          .expect(400);

        expect(mockService.delete).not.toHaveBeenCalled();
      },
    );
  });

  describe('404 handling for nonexistent resources', () => {
    it('GET /vacunas/:id returns 404 when the vaccination does not exist', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(vacunaNotFound),
      );

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${vacunaId}`)
        .expect(404);

      expect(mockService.findById).toHaveBeenCalledWith(vacunaId);
      expect(res.body).toEqual(notFoundBody(vacunaNotFound));
    });

    it('PUT /vacunas/:id returns 404 when the vaccination does not exist', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(vacunaNotFound),
      );

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${vacunaId}`)
        .send({ nombreVacuna: 'Moquillo' })
        .expect(404);

      expect(mockService.update).toHaveBeenCalledWith(vacunaId, {
        nombreVacuna: 'Moquillo',
      });
      expect(res.body).toEqual(notFoundBody(vacunaNotFound));
    });

    it('DELETE /vacunas/:id returns 404 when the vaccination does not exist', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(vacunaNotFound),
      );

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${vacunaId}`)
        .expect(404);

      expect(mockService.delete).toHaveBeenCalledWith(vacunaId);
      expect(res.body).toEqual(notFoundBody(vacunaNotFound));
    });

    it('POST /vacunas returns 404 when the associated pet does not exist', async () => {
      mockService.create.mockRejectedValue(
        new NotFoundException(mascotaNotFound),
      );

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(validPayload)
        .expect(404);

      expect(mockService.create).toHaveBeenCalledWith(validPayload);
      expect(res.body).toEqual(notFoundBody(mascotaNotFound));
    });
  });

  describe('POST /vacunas body validation', () => {
    it.each([
      ['mascota_id is missing', { mascota_id: undefined }],
      ['mascota_id is not a UUID', { mascota_id: '12345' }],
      ['mascota_id is empty', { mascota_id: '' }],
      ['nombreVacuna is missing', { nombreVacuna: undefined }],
      ['nombreVacuna is empty', { nombreVacuna: '' }],
      ['nombreVacuna exceeds 150 chars', { nombreVacuna: 'a'.repeat(151) }],
      ['nombreVacuna is not a string', { nombreVacuna: 42 }],
      ['loteVacuna is missing', { loteVacuna: undefined }],
      ['loteVacuna is empty', { loteVacuna: '' }],
      ['loteVacuna exceeds 100 chars', { loteVacuna: 'a'.repeat(101) }],
      ['fechaAplicacion is missing', { fechaAplicacion: undefined }],
      ['proximaDosis is missing', { proximaDosis: undefined }],
      ['fechaAplicacion is not a date', { fechaAplicacion: 'mañana' }],
      ['fechaAplicacion is not ISO 8601', { fechaAplicacion: '10/01/2024' }],
      ['proximaDosis is not ISO 8601', { proximaDosis: '10-01-2025' }],
      ['fechaAplicacion is an empty string', { fechaAplicacion: '' }],
      ['fechaAplicacion is a number', { fechaAplicacion: 20240110 }],
      ['proximaDosis is an ISO week date', { proximaDosis: '2025-W02-3' }],
      ['fechaAplicacion is 2024-02-30', { fechaAplicacion: '2024-02-30' }],
      ['proximaDosis is 2025-02-29 (not a leap year)', { proximaDosis: '2025-02-29' }],
      ['proximaDosis has month 13', { proximaDosis: '2025-13-01' }],
      ['observaciones is a number', { observaciones: 10 }],
      ['observaciones is an object', { observaciones: { texto: 'ok' } }],
    ])('returns 400 when %s', async (_label, override) => {
      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send({ ...validPayload, ...override })
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown property', { extra: true }, 'extra'],
      ['a client-supplied id', { id: vacunaId }, 'id'],
    ])('returns 400 when the body includes %s', async (_label, override, field) => {
      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send({ ...validPayload, ...override })
        .expect(400);

      expect(res.body.message).toContain(`property ${field} should not exist`);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('returns 400 for an empty body', async () => {
      await request(app.getHttpServer()).post(baseUrl).send({}).expect(400);

      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /vacunas/:id body validation', () => {
    it.each([
      ['nombreVacuna is empty', { nombreVacuna: '' }],
      ['nombreVacuna exceeds 150 chars', { nombreVacuna: 'a'.repeat(151) }],
      ['loteVacuna is empty', { loteVacuna: '' }],
      ['loteVacuna exceeds 100 chars', { loteVacuna: 'a'.repeat(101) }],
      ['fechaAplicacion is not a date', { fechaAplicacion: 'ayer' }],
      ['fechaAplicacion is not ISO 8601', { fechaAplicacion: '31/12/2024' }],
      ['proximaDosis is 2024-02-30', { proximaDosis: '2024-02-30' }],
      ['proximaDosis is an empty string', { proximaDosis: '' }],
      ['observaciones is not a string', { observaciones: 5 }],
    ])('returns 400 when %s', async (_label, body) => {
      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${vacunaId}`)
        .send(body)
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it.each([
      ['modify id', { id: '11111111-2222-4333-8444-555555555555' }, 'id'],
      ['modify mascota_id', { mascota_id: mascotaId }, 'mascota_id'],
      ['send an unknown property', { extra: 'valor' }, 'extra'],
    ])(
      'returns 400 when the request attempts to %s',
      async (_label, override, field) => {
        const res = await request(app.getHttpServer())
          .put(`${baseUrl}/${vacunaId}`)
          .send({ nombreVacuna: 'Moquillo', ...override })
          .expect(400);

        expect(res.body.message).toContain(
          `property ${field} should not exist`,
        );
        expect(mockService.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('optional and partial fields', () => {
    it('POST /vacunas returns 201 when observaciones is omitted', async () => {
      const { observaciones: _, ...withoutObservaciones } = validPayload;
      mockService.create.mockResolvedValue({
        message: 'Vacuna registrada con éxito',
        data: { id: vacunaId, ...withoutObservaciones, observaciones: '' },
      });

      await request(app.getHttpServer())
        .post(baseUrl)
        .send(withoutObservaciones)
        .expect(201);

      const [dto] = mockService.create.mock.calls[0];
      expect(dto).toEqual(withoutObservaciones);
      expect(dto.observaciones).toBeUndefined();
    });

    it('POST /vacunas returns 201 when observaciones is empty', async () => {
      const payload = { ...validPayload, observaciones: '' };
      mockService.create.mockResolvedValue({
        message: 'Vacuna registrada con éxito',
        data: { id: vacunaId, ...payload },
      });

      await request(app.getHttpServer()).post(baseUrl).send(payload).expect(201);

      expect(mockService.create).toHaveBeenCalledWith(payload);
    });

    it('POST /vacunas accepts full ISO timestamps for the dates', async () => {
      const payload = {
        ...validPayload,
        fechaAplicacion: '2024-01-10T10:30:00.000Z',
        proximaDosis: '2025-01-10T10:30:00-05:00',
      };
      mockService.create.mockResolvedValue({
        message: 'Vacuna registrada con éxito',
        data: { id: vacunaId, ...payload },
      });

      await request(app.getHttpServer()).post(baseUrl).send(payload).expect(201);

      // The controller passes the ISO strings through untouched; conversion
      // to calendar dates happens in the service.
      expect(mockService.create).toHaveBeenCalledWith(payload);
    });

    it.each([
      ['nombreVacuna', { nombreVacuna: 'Moquillo' }],
      ['fechaAplicacion', { fechaAplicacion: '2024-03-05' }],
      ['loteVacuna', { loteVacuna: 'LOT-2024-099' }],
      ['observaciones', { observaciones: 'Leve somnolencia' }],
      ['an empty observaciones', { observaciones: '' }],
      ['proximaDosis', { proximaDosis: '2026-03-05' }],
      ['nombreVacuna at 150 chars', { nombreVacuna: 'a'.repeat(150) }],
      ['loteVacuna at 100 chars', { loteVacuna: 'a'.repeat(100) }],
    ])(
      'PUT /vacunas/:id returns 200 with only %s',
      async (_label, body) => {
        mockService.update.mockResolvedValue({
          message: 'Vacuna actualizada con éxito',
          data: { ...storedVacuna, ...body },
        });

        const res = await request(app.getHttpServer())
          .put(`${baseUrl}/${vacunaId}`)
          .send(body)
          .expect(200);

        expect(mockService.update).toHaveBeenCalledTimes(1);
        const [id, dto] = mockService.update.mock.calls[0];
        expect(id).toBe(vacunaId);
        expect(dto).toEqual(body);
        expect(res.body.message).toBe('Vacuna actualizada con éxito');
      },
    );

    it('PUT /vacunas/:id accepts an empty body and forwards no changes', async () => {
      mockService.update.mockResolvedValue({
        message: 'Vacuna actualizada con éxito',
        data: storedVacuna,
      });

      await request(app.getHttpServer())
        .put(`${baseUrl}/${vacunaId}`)
        .send({})
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(vacunaId, {});
    });
  });
});
