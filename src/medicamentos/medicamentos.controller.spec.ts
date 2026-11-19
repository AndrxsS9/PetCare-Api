import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { MedicamentosController } from './medicamentos.controller.js';
import { MedicamentosService } from './medicamentos.service.js';
import {
  CreateMedicamentoDto,
  UpdateMedicamentoDto,
} from './medicamento.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.
describe('MedicamentosController (HTTP)', () => {
  let app: INestApplication;

  const baseUrl = '/medicamentos';
  const medicamentoId = '3e8b1f4c-6a2d-4c7e-9f0a-5b1c2d3e4f55';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const validPayload = {
    mascotaId,
    nombreMedicamento: 'Amoxicilina',
    dosis: '250 mg',
    frecuencia: 'Cada 12 horas',
    inicio: '2024-06-10',
    fin: '2024-06-17',
    observaciones: 'Administrar después de comer',
    estado: true,
  };

  const storedMedicamento = { id: medicamentoId, ...validPayload };

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

  const medicamentoNotFound = `Medicamento con ID ${medicamentoId} no encontrado`;
  const mascotaNotFound = `Mascota con ID ${mascotaId} no encontrada`;

  beforeEach(async () => {
    // Resets call history and any queued/implemented return values, so no
    // test depends on mock state left behind by another.
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicamentosController],
      providers: [{ provide: MedicamentosService, useValue: mockService }],
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
    it('GET /medicamentos returns 200 with the list of records', async () => {
      mockService.findAll.mockResolvedValue([storedMedicamento]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(mockService.findAll).toHaveBeenCalledWith();
      expect(res.body).toEqual([storedMedicamento]);
    });

    it('GET /medicamentos returns 200 with an empty list', async () => {
      mockService.findAll.mockResolvedValue([]);

      const res = await request(app.getHttpServer()).get(baseUrl).expect(200);

      expect(res.body).toEqual([]);
    });

    it('GET /medicamentos/:id returns 200 and keeps the { message, data } format', async () => {
      const response = {
        message: 'Medicamento encontrado',
        data: storedMedicamento,
      };
      mockService.findById.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${medicamentoId}`)
        .expect(200);

      expect(mockService.findById).toHaveBeenCalledTimes(1);
      expect(mockService.findById).toHaveBeenCalledWith(medicamentoId);
      expect(res.body).toEqual(response);
    });

    it('POST /medicamentos returns 201 for a valid medication record', async () => {
      const response = {
        message: 'Medicamento creado con éxito',
        data: storedMedicamento,
      };
      mockService.create.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(validPayload)
        .expect(201);

      expect(mockService.create).toHaveBeenCalledTimes(1);
      const [dto] = mockService.create.mock.calls[0];
      expect(dto).toBeInstanceOf(CreateMedicamentoDto);
      expect(dto).toEqual(validPayload);
      expect(res.body).toEqual(response);
    });

    it('PUT /medicamentos/:id returns 200 for a valid partial update', async () => {
      const changes = { dosis: '500 mg', fin: '2024-06-24' };
      const response = {
        message: 'Medicamento actualizado con éxito',
        data: { ...storedMedicamento, ...changes },
      };
      mockService.update.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${medicamentoId}`)
        .send(changes)
        .expect(200);

      expect(mockService.update).toHaveBeenCalledTimes(1);
      const [id, dto] = mockService.update.mock.calls[0];
      expect(id).toBe(medicamentoId);
      expect(dto).toBeInstanceOf(UpdateMedicamentoDto);
      expect(dto).toEqual(changes);
      expect(res.body).toEqual(response);
    });

    it('DELETE /medicamentos/:id returns 200', async () => {
      const response = { message: 'Medicamento eliminado con éxito' };
      mockService.delete.mockResolvedValue(response);

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${medicamentoId}`)
        .expect(200);

      expect(mockService.delete).toHaveBeenCalledTimes(1);
      expect(mockService.delete).toHaveBeenCalledWith(medicamentoId);
      expect(res.body).toEqual(response);
    });
  });

  describe('ParseUUIDPipe on :id', () => {
    const malformedIds = [
      '123',
      'not-a-uuid',
      '3e8b1f4c-6a2d-4c7e-9f0a-5b1c2d3e4f5', // one character short
      '3e8b1f4c6a2d4c7e9f0a5b1c2d3e4f55', // missing hyphens
    ];

    it.each(malformedIds)(
      'GET /medicamentos/%s returns 400 without calling the service',
      async (id) => {
        const res = await request(app.getHttpServer())
          .get(`${baseUrl}/${id}`)
          .expect(400);

        expect(res.body.statusCode).toBe(400);
        expect(mockService.findById).not.toHaveBeenCalled();
      },
    );

    it.each(malformedIds)(
      'PUT /medicamentos/%s returns 400 without calling the service',
      async (id) => {
        await request(app.getHttpServer())
          .put(`${baseUrl}/${id}`)
          .send({ dosis: '500 mg' })
          .expect(400);

        expect(mockService.update).not.toHaveBeenCalled();
      },
    );

    it.each(malformedIds)(
      'DELETE /medicamentos/%s returns 400 without calling the service',
      async (id) => {
        await request(app.getHttpServer())
          .delete(`${baseUrl}/${id}`)
          .expect(400);

        expect(mockService.delete).not.toHaveBeenCalled();
      },
    );
  });

  describe('404 handling for nonexistent resources', () => {
    it('GET /medicamentos/:id returns 404 when the record does not exist', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(medicamentoNotFound),
      );

      const res = await request(app.getHttpServer())
        .get(`${baseUrl}/${medicamentoId}`)
        .expect(404);

      expect(mockService.findById).toHaveBeenCalledWith(medicamentoId);
      expect(res.body).toEqual(notFoundBody(medicamentoNotFound));
    });

    it('PUT /medicamentos/:id returns 404 when the record does not exist', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(medicamentoNotFound),
      );

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${medicamentoId}`)
        .send({ dosis: '500 mg' })
        .expect(404);

      expect(mockService.update).toHaveBeenCalledWith(medicamentoId, {
        dosis: '500 mg',
      });
      expect(res.body).toEqual(notFoundBody(medicamentoNotFound));
    });

    it('DELETE /medicamentos/:id returns 404 when the record does not exist', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(medicamentoNotFound),
      );

      const res = await request(app.getHttpServer())
        .delete(`${baseUrl}/${medicamentoId}`)
        .expect(404);

      expect(mockService.delete).toHaveBeenCalledWith(medicamentoId);
      expect(res.body).toEqual(notFoundBody(medicamentoNotFound));
    });

    it('POST /medicamentos returns 404 when the associated pet does not exist', async () => {
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

  describe('POST /medicamentos body validation', () => {
    it.each([
      ['mascotaId is missing', { mascotaId: undefined }],
      ['mascotaId is not a UUID', { mascotaId: '12345' }],
      ['mascotaId is empty', { mascotaId: '' }],
      ['nombreMedicamento is missing', { nombreMedicamento: undefined }],
      ['nombreMedicamento is empty', { nombreMedicamento: '' }],
      [
        'nombreMedicamento exceeds 150 chars',
        { nombreMedicamento: 'a'.repeat(151) },
      ],
      ['nombreMedicamento is not a string', { nombreMedicamento: 42 }],
      ['dosis is missing', { dosis: undefined }],
      ['dosis is empty', { dosis: '' }],
      ['dosis exceeds 100 chars', { dosis: 'a'.repeat(101) }],
      ['frecuencia is missing', { frecuencia: undefined }],
      ['frecuencia is empty', { frecuencia: '' }],
      ['frecuencia exceeds 100 chars', { frecuencia: 'a'.repeat(101) }],
      ['inicio is missing', { inicio: undefined }],
      ['fin is missing', { fin: undefined }],
      ['inicio is not a date', { inicio: 'mañana' }],
      ['inicio is not ISO 8601', { inicio: '10/06/2024' }],
      ['fin is not ISO 8601', { fin: '17-06-2024' }],
      ['inicio is an empty string', { inicio: '' }],
      ['fin is a number', { fin: 20240617 }],
      ['inicio is an ISO week date', { inicio: '2024-W24-1' }],
      ['inicio is 2024-02-30', { inicio: '2024-02-30' }],
      ['fin is 2023-02-29 (not a leap year)', { fin: '2023-02-29' }],
      ['fin has month 13', { fin: '2024-13-01' }],
      ['estado is the string "true"', { estado: 'true' }],
      ['estado is a number', { estado: 1 }],
      ['estado is an object', { estado: { activo: true } }],
      ['observaciones is a number', { observaciones: 10 }],
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
      ['a client-supplied id', { id: medicamentoId }, 'id'],
    ])(
      'returns 400 when the body includes %s',
      async (_label, override, field) => {
        const res = await request(app.getHttpServer())
          .post(baseUrl)
          .send({ ...validPayload, ...override })
          .expect(400);

        expect(res.body.message).toContain(
          `property ${field} should not exist`,
        );
        expect(mockService.create).not.toHaveBeenCalled();
      },
    );

    it('returns 400 for an empty body', async () => {
      await request(app.getHttpServer()).post(baseUrl).send({}).expect(400);

      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /medicamentos/:id body validation', () => {
    it.each([
      ['nombreMedicamento is empty', { nombreMedicamento: '' }],
      [
        'nombreMedicamento exceeds 150 chars',
        { nombreMedicamento: 'a'.repeat(151) },
      ],
      ['dosis is empty', { dosis: '' }],
      ['dosis exceeds 100 chars', { dosis: 'a'.repeat(101) }],
      ['frecuencia is empty', { frecuencia: '' }],
      ['frecuencia exceeds 100 chars', { frecuencia: 'a'.repeat(101) }],
      ['inicio is not a date', { inicio: 'ayer' }],
      ['inicio is not ISO 8601', { inicio: '31/12/2024' }],
      ['fin is 2024-02-30', { fin: '2024-02-30' }],
      ['fin is an empty string', { fin: '' }],
      ['estado is the string "false"', { estado: 'false' }],
      ['estado is a number', { estado: 0 }],
      ['observaciones is not a string', { observaciones: 5 }],
    ])('returns 400 when %s', async (_label, body) => {
      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${medicamentoId}`)
        .send(body)
        .expect(400);

      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it.each([
      ['modify id', { id: '11111111-2222-4333-8444-555555555555' }, 'id'],
      ['modify mascotaId', { mascotaId }, 'mascotaId'],
      ['send an unknown property', { extra: 'valor' }, 'extra'],
    ])(
      'returns 400 when the request attempts to %s',
      async (_label, override, field) => {
        const res = await request(app.getHttpServer())
          .put(`${baseUrl}/${medicamentoId}`)
          .send({ dosis: '500 mg', ...override })
          .expect(400);

        expect(res.body.message).toContain(
          `property ${field} should not exist`,
        );
        expect(mockService.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('optional and partial fields', () => {
    it('POST /medicamentos returns 201 when observaciones is omitted', async () => {
      const { observaciones: _, ...withoutObservaciones } = validPayload;
      mockService.create.mockResolvedValue({
        message: 'Medicamento creado con éxito',
        data: { id: medicamentoId, ...withoutObservaciones, observaciones: '' },
      });

      await request(app.getHttpServer())
        .post(baseUrl)
        .send(withoutObservaciones)
        .expect(201);

      const [dto] = mockService.create.mock.calls[0];
      expect(dto).toEqual(withoutObservaciones);
      expect(dto.observaciones).toBeUndefined();
    });

    it('POST /medicamentos returns 201 when observaciones is empty', async () => {
      const payload = { ...validPayload, observaciones: '' };
      mockService.create.mockResolvedValue({
        message: 'Medicamento creado con éxito',
        data: { id: medicamentoId, ...payload },
      });

      await request(app.getHttpServer())
        .post(baseUrl)
        .send(payload)
        .expect(201);

      expect(mockService.create).toHaveBeenCalledWith(payload);
    });

    it('POST /medicamentos returns 201 when estado is omitted', async () => {
      const { estado: _, ...withoutEstado } = validPayload;
      mockService.create.mockResolvedValue({
        message: 'Medicamento creado con éxito',
        data: { id: medicamentoId, ...withoutEstado, estado: true },
      });

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(withoutEstado)
        .expect(201);

      // The default of true is applied by the service, not the controller.
      const [dto] = mockService.create.mock.calls[0];
      expect(dto.estado).toBeUndefined();
      expect(res.body.data.estado).toBe(true);
    });

    it('POST /medicamentos forwards an explicit estado false', async () => {
      const payload = { ...validPayload, estado: false };
      mockService.create.mockResolvedValue({
        message: 'Medicamento creado con éxito',
        data: { id: medicamentoId, ...payload },
      });

      const res = await request(app.getHttpServer())
        .post(baseUrl)
        .send(payload)
        .expect(201);

      expect(mockService.create.mock.calls[0][0].estado).toBe(false);
      expect(res.body.data.estado).toBe(false);
    });

    it('POST /medicamentos accepts full ISO timestamps for the dates', async () => {
      const payload = {
        ...validPayload,
        inicio: '2024-06-10T10:30:00.000Z',
        fin: '2024-06-17T10:30:00-05:00',
      };
      mockService.create.mockResolvedValue({
        message: 'Medicamento creado con éxito',
        data: { id: medicamentoId, ...payload },
      });

      await request(app.getHttpServer())
        .post(baseUrl)
        .send(payload)
        .expect(201);

      // The controller passes the ISO strings through untouched; conversion
      // to calendar dates happens in the service.
      expect(mockService.create).toHaveBeenCalledWith(payload);
    });

    it('PUT /medicamentos/:id forwards an explicit estado false', async () => {
      mockService.update.mockResolvedValue({
        message: 'Medicamento actualizado con éxito',
        data: { ...storedMedicamento, estado: false },
      });

      const res = await request(app.getHttpServer())
        .put(`${baseUrl}/${medicamentoId}`)
        .send({ estado: false })
        .expect(200);

      const [id, dto] = mockService.update.mock.calls[0];
      expect(id).toBe(medicamentoId);
      expect(dto).toEqual({ estado: false });
      expect(dto.estado).toBe(false);
      expect(res.body.data.estado).toBe(false);
    });

    it.each([
      ['nombreMedicamento', { nombreMedicamento: 'Cefalexina' }],
      ['dosis', { dosis: '1 tableta' }],
      ['frecuencia', { frecuencia: 'Cada 8 horas' }],
      ['inicio', { inicio: '2024-07-01' }],
      ['fin', { fin: '2024-07-08' }],
      ['observaciones', { observaciones: 'Suspender si hay vómito' }],
      ['an empty observaciones', { observaciones: '' }],
      ['estado true', { estado: true }],
      [
        'nombreMedicamento at 150 chars',
        { nombreMedicamento: 'a'.repeat(150) },
      ],
      ['dosis at 100 chars', { dosis: 'a'.repeat(100) }],
    ])(
      'PUT /medicamentos/:id returns 200 with only %s',
      async (_label, body) => {
        mockService.update.mockResolvedValue({
          message: 'Medicamento actualizado con éxito',
          data: { ...storedMedicamento, ...body },
        });

        const res = await request(app.getHttpServer())
          .put(`${baseUrl}/${medicamentoId}`)
          .send(body)
          .expect(200);

        expect(mockService.update).toHaveBeenCalledTimes(1);
        const [id, dto] = mockService.update.mock.calls[0];
        expect(id).toBe(medicamentoId);
        expect(dto).toEqual(body);
        expect(res.body.message).toBe('Medicamento actualizado con éxito');
      },
    );

    it('PUT /medicamentos/:id accepts an empty body and forwards no changes', async () => {
      mockService.update.mockResolvedValue({
        message: 'Medicamento actualizado con éxito',
        data: storedMedicamento,
      });

      await request(app.getHttpServer())
        .put(`${baseUrl}/${medicamentoId}`)
        .send({})
        .expect(200);

      expect(mockService.update).toHaveBeenCalledWith(medicamentoId, {});
    });
  });
});
