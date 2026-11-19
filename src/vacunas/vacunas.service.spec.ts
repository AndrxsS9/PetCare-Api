import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { VacunasService, toCalendarDate } from './vacunas.service.js';
import { VacunaEntity } from './vacuna.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';

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

describe('VacunasService', () => {
  let service: VacunasService;

  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';
  const vacunaId = '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c33';

  const buildVacuna = (): VacunaEntity =>
    ({
      id: vacunaId,
      mascota_id: mascotaId,
      nombreVacuna: 'Rabia',
      fechaAplicacion: new Date(2024, 0, 10),
      loteVacuna: 'LOT-2024-001',
      observaciones: 'Sin reacciones adversas',
      proximaDosis: new Date(2025, 0, 10),
    }) as VacunaEntity;

  const mockVacunaRepo = {
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

    mockVacunaRepo.create.mockImplementation((data) => ({ ...data }));
    mockVacunaRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id ?? vacunaId,
    }));
    mockVacunaRepo.merge.mockImplementation((target, changes) =>
      Object.assign(target, changes),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacunasService,
        {
          provide: getRepositoryToken(VacunaEntity),
          useValue: mockVacunaRepo,
        },
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
      ],
    }).compile();

    service = module.get<VacunasService>(VacunasService);
  });

  describe('toCalendarDate', () => {
    it.each([
      ['a plain date', '2024-01-10'],
      ['a UTC timestamp', '2024-01-10T00:00:00.000Z'],
      ['a late timestamp with a negative offset', '2024-01-10T23:30:00-05:00'],
      ['a timestamp with a positive offset', '2024-01-10T01:00:00+09:00'],
    ])('keeps the written calendar day for %s', (_label, iso) => {
      expectCalendarDay(toCalendarDate(iso), 2024, 1, 10);
    });

    it('handles leap days and month boundaries', () => {
      expectCalendarDay(toCalendarDate('2024-02-29'), 2024, 2, 29);
      expectCalendarDay(toCalendarDate('2024-12-31'), 2024, 12, 31);
    });
  });

  describe('findAll', () => {
    it('lists all vaccinations', async () => {
      const vacunas = [buildVacuna()];
      mockVacunaRepo.find.mockResolvedValue(vacunas);

      await expect(service.findAll()).resolves.toEqual(vacunas);
      expect(mockVacunaRepo.find).toHaveBeenCalledTimes(1);
    });

    it('returns an empty list when there are no vaccinations', async () => {
      mockVacunaRepo.find.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns an existing vaccination wrapped in a message', async () => {
      const vacuna = buildVacuna();
      mockVacunaRepo.findOne.mockResolvedValue(vacuna);

      await expect(service.findById(vacunaId)).resolves.toEqual({
        message: 'Vacuna encontrada',
        data: vacuna,
      });
      expect(mockVacunaRepo.findOne).toHaveBeenCalledWith({
        where: { id: vacunaId },
      });
    });

    it('throws NotFoundException (HTTP 404) for a nonexistent vaccination', async () => {
      mockVacunaRepo.findOne.mockResolvedValue(null);

      const error = await service.findById(vacunaId).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getStatus()).toBe(404);
      expect((error as NotFoundException).message).toBe(
        `Vacuna con ID ${vacunaId} no encontrada`,
      );
    });
  });

  describe('create', () => {
    const payload: CreateVacunaDto = {
      mascota_id: mascotaId,
      nombreVacuna: 'Parvovirus',
      fechaAplicacion: '2024-02-15',
      loteVacuna: 'LOT-2024-022',
      observaciones: 'Aplicada sin inconvenientes',
      proximaDosis: '2025-02-15T10:00:00.000Z',
    };

    it('creates a vaccination for an existing pet', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId },
      });
      expect(mockVacunaRepo.create).toHaveBeenCalledTimes(1);
      expect(mockVacunaRepo.save).toHaveBeenCalledTimes(1);
      expect(mockVacunaRepo.save).toHaveBeenCalledWith(
        mockVacunaRepo.create.mock.results[0].value,
      );
      expect(result).toEqual({
        message: 'Vacuna registrada con éxito',
        data: {
          id: vacunaId,
          mascota_id: mascotaId,
          nombreVacuna: 'Parvovirus',
          fechaAplicacion: new Date(2024, 1, 15),
          loteVacuna: 'LOT-2024-022',
          observaciones: 'Aplicada sin inconvenientes',
          proximaDosis: new Date(2025, 1, 15),
        },
      });
    });

    it('converts ISO date strings into calendar Date values', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      await service.create(payload);

      const created = mockVacunaRepo.create.mock.calls[0][0];
      expectCalendarDay(created.fechaAplicacion, 2024, 2, 15);
      expectCalendarDay(created.proximaDosis, 2025, 2, 15);
    });

    it('defaults observaciones to an empty string when omitted', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });
      const { observaciones: _, ...withoutObservaciones } = payload;

      const result = await service.create(withoutObservaciones);

      expect(mockVacunaRepo.create.mock.calls[0][0].observaciones).toBe('');
      expect(result.data.observaciones).toBe('');
    });

    it('throws NotFoundException when the pet does not exist', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(payload)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${mascotaId} no encontrada`),
      );
      expect(mockVacunaRepo.create).not.toHaveBeenCalled();
      expect(mockVacunaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies a partial update without overwriting omitted fields', async () => {
      const vacuna = buildVacuna();
      mockVacunaRepo.findOne.mockResolvedValue(vacuna);

      const result = await service.update(vacunaId, {
        loteVacuna: 'LOT-2024-099',
        // simulates an omitted field present as undefined on the DTO instance
        nombreVacuna: undefined,
      });

      expect(mockVacunaRepo.findOne).toHaveBeenCalledWith({
        where: { id: vacunaId },
      });
      expect(mockVacunaRepo.merge).toHaveBeenCalledWith(vacuna, {
        loteVacuna: 'LOT-2024-099',
      });
      expect(mockVacunaRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Vacuna actualizada con éxito',
        data: { ...buildVacuna(), loteVacuna: 'LOT-2024-099' },
      });
    });

    it('converts updated ISO dates into calendar Date values', async () => {
      mockVacunaRepo.findOne.mockResolvedValue(buildVacuna());

      await service.update(vacunaId, {
        fechaAplicacion: '2024-03-05',
        proximaDosis: '2025-03-05T23:00:00-05:00',
      });

      const changes = mockVacunaRepo.merge.mock.calls[0][1];
      expect(Object.keys(changes).sort()).toEqual([
        'fechaAplicacion',
        'proximaDosis',
      ]);
      expectCalendarDay(changes.fechaAplicacion, 2024, 3, 5);
      expectCalendarDay(changes.proximaDosis, 2025, 3, 5);
    });

    it('allows clearing observaciones with an empty string', async () => {
      mockVacunaRepo.findOne.mockResolvedValue(buildVacuna());

      const result = await service.update(vacunaId, { observaciones: '' });

      expect(mockVacunaRepo.merge.mock.calls[0][1]).toEqual({
        observaciones: '',
      });
      expect(result.data.observaciones).toBe('');
    });

    it('ignores id and mascota_id even if they reach the service', async () => {
      mockVacunaRepo.findOne.mockResolvedValue(buildVacuna());
      const otherId = '11111111-2222-4333-8444-555555555555';

      const result = await service.update(vacunaId, {
        id: otherId,
        mascota_id: otherId,
        nombreVacuna: 'Moquillo',
      } as UpdateVacunaDto);

      expect(mockVacunaRepo.merge.mock.calls[0][1]).toEqual({
        nombreVacuna: 'Moquillo',
      });
      expect(result.data.id).toBe(vacunaId);
      expect(result.data.mascota_id).toBe(mascotaId);
    });

    it('throws NotFoundException for a nonexistent vaccination', async () => {
      mockVacunaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(vacunaId, { loteVacuna: 'LOT-X' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockVacunaRepo.merge).not.toHaveBeenCalled();
      expect(mockVacunaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing vaccination', async () => {
      mockVacunaRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(vacunaId)).resolves.toEqual({
        message: 'Vacuna eliminada con éxito',
      });
      expect(mockVacunaRepo.delete).toHaveBeenCalledWith(vacunaId);
    });

    it('throws NotFoundException for a nonexistent vaccination', async () => {
      mockVacunaRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete(vacunaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
