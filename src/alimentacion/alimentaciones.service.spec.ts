import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AlimentacionesService } from './alimentaciones.service.js';
import { AlimentacionEntity } from './alimentacion.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CreateAlimentacionDto } from './alimentacion.dto.js';
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

describe('AlimentacionesService', () => {
  let service: AlimentacionesService;

  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';
  const alimentacionId = '5a1e7c2d-8f3b-4d6a-9c0e-3b2a1f4e6d77';

  const buildAlimentacion = (): AlimentacionEntity =>
    ({
      id: alimentacionId,
      mascotaId,
      tipoAlimento: 'Concentrado',
      marca: 'Royal Canin',
      cantidad: 250,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '08:00 y 18:00',
      observaciones: 'Dividir la porción en dos comidas',
    }) as AlimentacionEntity;

  const mockAlimentacionRepo = {
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

    mockAlimentacionRepo.create.mockImplementation((data) => ({ ...data }));
    mockAlimentacionRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id ?? alimentacionId,
    }));
    mockAlimentacionRepo.merge.mockImplementation((target, changes) =>
      Object.assign(target, changes),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlimentacionesService,
        {
          provide: getRepositoryToken(AlimentacionEntity),
          useValue: mockAlimentacionRepo,
        },
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
      ],
    }).compile();

    service = module.get<AlimentacionesService>(AlimentacionesService);
  });

  describe('findAll', () => {
    it('lists all feeding records', async () => {
      const alimentaciones = [buildAlimentacion()];
      mockAlimentacionRepo.find.mockResolvedValue(alimentaciones);

      await expect(service.findAll(adminUser)).resolves.toEqual(alimentaciones);
      expect(mockAlimentacionRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('returns an existing record wrapped in a message', async () => {
      const alimentacion = buildAlimentacion();
      mockAlimentacionRepo.findOne.mockResolvedValue(alimentacion);

      await expect(service.findById(alimentacionId, adminUser)).resolves.toEqual({
        message: 'Alimentación encontrada',
        data: alimentacion,
      });
      expect(mockAlimentacionRepo.findOne).toHaveBeenCalledWith({
        where: { id: alimentacionId },
      });
    });

    it('throws NotFoundException for a nonexistent record', async () => {
      mockAlimentacionRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const payload: CreateAlimentacionDto = {
      mascotaId,
      tipoAlimento: 'Concentrado',
      marca: 'Purina',
      cantidad: 80,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '09:00 y 19:00',
      observaciones: 'Agregar agua tibia',
    };

    it('creates a feeding record for an existing pet', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload, adminUser);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId },
      });
      expect(mockAlimentacionRepo.create).toHaveBeenCalledWith(payload);
      expect(mockAlimentacionRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Alimentación creada con éxito',
        data: { ...payload, id: alimentacionId },
      });
    });

    it('defaults observaciones to an empty string when omitted', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });
      const { observaciones: _, ...withoutObservaciones } = payload;

      const result = await service.create(withoutObservaciones, adminUser);

      expect(
        mockAlimentacionRepo.create.mock.calls[0][0].observaciones,
      ).toBe('');
      expect(result.data.observaciones).toBe('');
    });

    it('throws NotFoundException when the pet does not exist', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(payload, adminUser)).rejects.toThrow(NotFoundException);
      expect(mockAlimentacionRepo.create).not.toHaveBeenCalled();
      expect(mockAlimentacionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies a partial update without overwriting omitted fields', async () => {
      const alimentacion = buildAlimentacion();
      mockAlimentacionRepo.findOne.mockResolvedValue(alimentacion);

      const result = await service.update(alimentacionId, {
        cantidad: 300,
        // simulates an omitted field present as undefined on the DTO instance
        marca: undefined,
      }, adminUser);

      expect(mockAlimentacionRepo.merge).toHaveBeenCalledWith(alimentacion, {
        cantidad: 300,
      });
      expect(result).toEqual({
        message: 'Alimentación actualizada con éxito',
        data: { ...buildAlimentacion(), cantidad: 300 },
      });
    });

    it('throws NotFoundException for a nonexistent record', async () => {
      mockAlimentacionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { cantidad: 100 }, adminUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockAlimentacionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing record', async () => {
      mockAlimentacionRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(alimentacionId, adminUser)).resolves.toEqual({
        message: 'Alimentación eliminada con éxito',
      });
      expect(mockAlimentacionRepo.delete).toHaveBeenCalledWith(alimentacionId);
    });

    it('throws NotFoundException for a nonexistent record', async () => {
      mockAlimentacionRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
