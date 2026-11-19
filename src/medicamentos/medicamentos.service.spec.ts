import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MedicamentosService } from './medicamentos.service.js';
import { MedicamentoEntity } from './medicamento.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import {
  CreateMedicamentoDto,
  UpdateMedicamentoDto,
} from './medicamento.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.

/** Asserts a Date's local calendar day, independent of the test timezone. */
const expectCalendarDay = (
  value: unknown,
  year: number,
  month: number,
  day: number,
) => {
  expect(value).toBeInstanceOf(Date);
  const date = value as Date;
  expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([
    year,
    month,
    day,
  ]);
  expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([
    0, 0, 0,
  ]);
};

describe('MedicamentosService', () => {
  let service: MedicamentosService;

  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';
  const medicamentoId = '3e8b1f4c-6a2d-4c7e-9f0a-5b1c2d3e4f55';

  const buildMedicamento = (): MedicamentoEntity =>
    ({
      id: medicamentoId,
      mascotaId,
      nombreMedicamento: 'Amoxicilina',
      dosis: '250 mg',
      frecuencia: 'Cada 12 horas',
      inicio: new Date(2024, 5, 10),
      fin: new Date(2024, 5, 17),
      observaciones: 'Administrar después de comer',
      estado: true,
    }) as MedicamentoEntity;

  const mockMedicamentoRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    delete: vi.fn(),
  };

  const mockMascotaRepo = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockMedicamentoRepo.create.mockImplementation((data) => ({ ...data }));
    mockMedicamentoRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id ?? medicamentoId,
    }));
    mockMedicamentoRepo.merge.mockImplementation((target, changes) =>
      Object.assign(target, changes),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicamentosService,
        {
          provide: getRepositoryToken(MedicamentoEntity),
          useValue: mockMedicamentoRepo,
        },
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
      ],
    }).compile();

    service = module.get<MedicamentosService>(MedicamentosService);
  });

  describe('findAll', () => {
    it('lists all medication records', async () => {
      const medicamentos = [buildMedicamento()];
      mockMedicamentoRepo.find.mockResolvedValue(medicamentos);

      await expect(service.findAll()).resolves.toEqual(medicamentos);
      expect(mockMedicamentoRepo.find).toHaveBeenCalledTimes(1);
    });

    it('returns an empty list when there are no records', async () => {
      mockMedicamentoRepo.find.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns an existing record wrapped in a message', async () => {
      const medicamento = buildMedicamento();
      mockMedicamentoRepo.findOne.mockResolvedValue(medicamento);

      await expect(service.findById(medicamentoId)).resolves.toEqual({
        message: 'Medicamento encontrado',
        data: medicamento,
      });
      expect(mockMedicamentoRepo.findOne).toHaveBeenCalledWith({
        where: { id: medicamentoId },
      });
    });

    it('throws NotFoundException (HTTP 404) for a nonexistent record', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(null);

      const error = await service
        .findById(medicamentoId)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(404);
      expect((error as NotFoundException).message).toBe(
        `Medicamento con ID ${medicamentoId} no encontrado`,
      );
    });
  });

  describe('create', () => {
    const payload: CreateMedicamentoDto = {
      mascotaId,
      nombreMedicamento: 'Meloxicam',
      dosis: '0.5 ml',
      frecuencia: 'Cada 24 horas',
      inicio: '2024-06-10',
      fin: '2024-06-17T10:00:00.000Z',
      observaciones: 'Con alimento',
      estado: true,
    };

    it('creates a medication record for an existing pet', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId },
      });
      expect(mockMedicamentoRepo.create).toHaveBeenCalledTimes(1);
      expect(mockMedicamentoRepo.save).toHaveBeenCalledTimes(1);
      expect(mockMedicamentoRepo.save).toHaveBeenCalledWith(
        mockMedicamentoRepo.create.mock.results[0].value,
      );
      expect(result).toEqual({
        message: 'Medicamento creado con éxito',
        data: {
          id: medicamentoId,
          mascotaId,
          nombreMedicamento: 'Meloxicam',
          dosis: '0.5 ml',
          frecuencia: 'Cada 24 horas',
          inicio: new Date(2024, 5, 10),
          fin: new Date(2024, 5, 17),
          observaciones: 'Con alimento',
          estado: true,
        },
      });
    });

    it('converts ISO date strings into calendar Date values', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      await service.create({
        ...payload,
        inicio: '2024-02-29T23:30:00-05:00',
        fin: '2024-03-01T01:00:00+09:00',
      });

      const created = mockMedicamentoRepo.create.mock.calls[0][0];
      // The calendar day written by the client is kept, whatever the offset.
      expectCalendarDay(created.inicio, 2024, 2, 29);
      expectCalendarDay(created.fin, 2024, 3, 1);
    });

    it('defaults estado to true when omitted', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });
      const { estado: _, ...withoutEstado } = payload;

      const result = await service.create(withoutEstado);

      expect(mockMedicamentoRepo.create.mock.calls[0][0].estado).toBe(true);
      expect(result.data.estado).toBe(true);
    });

    it('keeps an explicit estado false', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create({ ...payload, estado: false });

      expect(mockMedicamentoRepo.create.mock.calls[0][0].estado).toBe(false);
      expect(result.data.estado).toBe(false);
    });

    it('defaults observaciones to an empty string when omitted', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });
      const { observaciones: _, ...withoutObservaciones } = payload;

      const result = await service.create(withoutObservaciones);

      expect(mockMedicamentoRepo.create.mock.calls[0][0].observaciones).toBe(
        '',
      );
      expect(result.data.observaciones).toBe('');
    });

    it('throws NotFoundException when the pet does not exist', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(payload)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${mascotaId} no encontrada`),
      );
      expect(mockMedicamentoRepo.create).not.toHaveBeenCalled();
      expect(mockMedicamentoRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies a partial update without overwriting omitted fields', async () => {
      const medicamento = buildMedicamento();
      mockMedicamentoRepo.findOne.mockResolvedValue(medicamento);

      const result = await service.update(medicamentoId, {
        dosis: '500 mg',
        // simulates an omitted field present as undefined on the DTO instance
        frecuencia: undefined,
      });

      expect(mockMedicamentoRepo.findOne).toHaveBeenCalledWith({
        where: { id: medicamentoId },
      });
      expect(mockMedicamentoRepo.merge).toHaveBeenCalledWith(medicamento, {
        dosis: '500 mg',
      });
      expect(mockMedicamentoRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Medicamento actualizado con éxito',
        data: { ...buildMedicamento(), dosis: '500 mg' },
      });
    });

    it('keeps an explicit estado false', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(buildMedicamento());

      const result = await service.update(medicamentoId, { estado: false });

      expect(mockMedicamentoRepo.merge.mock.calls[0][1]).toEqual({
        estado: false,
      });
      expect(result.data.estado).toBe(false);
    });

    it('converts updated ISO dates into calendar Date values', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(buildMedicamento());

      await service.update(medicamentoId, {
        inicio: '2024-07-01',
        fin: '2024-07-08T23:00:00-05:00',
      });

      const changes = mockMedicamentoRepo.merge.mock.calls[0][1];
      expect(Object.keys(changes).sort()).toEqual(['fin', 'inicio']);
      expectCalendarDay(changes.inicio, 2024, 7, 1);
      expectCalendarDay(changes.fin, 2024, 7, 8);
    });

    it('allows clearing observaciones with an empty string', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(buildMedicamento());

      const result = await service.update(medicamentoId, {
        observaciones: '',
      });

      expect(mockMedicamentoRepo.merge.mock.calls[0][1]).toEqual({
        observaciones: '',
      });
      expect(result.data.observaciones).toBe('');
    });

    it('updates every allowed field at once', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(buildMedicamento());

      await service.update(medicamentoId, {
        nombreMedicamento: 'Cefalexina',
        dosis: '1 tableta',
        frecuencia: 'Cada 8 horas',
        inicio: '2024-08-01',
        fin: '2024-08-10',
        observaciones: 'Suspender si hay vómito',
        estado: false,
      });

      const changes = mockMedicamentoRepo.merge.mock.calls[0][1];
      expect(changes).toEqual({
        nombreMedicamento: 'Cefalexina',
        dosis: '1 tableta',
        frecuencia: 'Cada 8 horas',
        inicio: new Date(2024, 7, 1),
        fin: new Date(2024, 7, 10),
        observaciones: 'Suspender si hay vómito',
        estado: false,
      });
    });

    it('ignores id and mascotaId even if they reach the service', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(buildMedicamento());
      const otherId = '11111111-2222-4333-8444-555555555555';

      const result = await service.update(medicamentoId, {
        id: otherId,
        mascotaId: otherId,
        dosis: '100 mg',
      } as UpdateMedicamentoDto);

      expect(mockMedicamentoRepo.merge.mock.calls[0][1]).toEqual({
        dosis: '100 mg',
      });
      expect(result.data.id).toBe(medicamentoId);
      expect(result.data.mascotaId).toBe(mascotaId);
    });

    it('throws NotFoundException for a nonexistent record', async () => {
      mockMedicamentoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(medicamentoId, { dosis: '100 mg' }),
      ).rejects.toThrow(
        new NotFoundException(
          `Medicamento con ID ${medicamentoId} no encontrado`,
        ),
      );
      expect(mockMedicamentoRepo.merge).not.toHaveBeenCalled();
      expect(mockMedicamentoRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing record', async () => {
      mockMedicamentoRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(medicamentoId)).resolves.toEqual({
        message: 'Medicamento eliminado con éxito',
      });
      expect(mockMedicamentoRepo.delete).toHaveBeenCalledWith(medicamentoId);
    });

    it('throws NotFoundException for a nonexistent record', async () => {
      mockMedicamentoRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete(medicamentoId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
