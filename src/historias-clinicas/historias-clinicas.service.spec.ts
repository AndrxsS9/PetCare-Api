import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { HistoriasClinicasService } from './historias-clinicas.service.js';
import { HistoriaClinicaEntity } from './historia-clinica.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CreateHistoriaClinicaDto } from './historia-clinica.dto.js';
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

describe('HistoriasClinicasService', () => {
  let service: HistoriasClinicasService;

  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';
  const historiaId = '7d2c5e9a-1b4f-4c3d-8e6a-2f9b0c7d5e33';

  const buildHistoria = (): HistoriaClinicaEntity =>
    ({
      id: historiaId,
      mascotaId,
      fechaConsulta: new Date('2026-01-15T10:00:00.000Z'),
      diagnostico: 'Buen estado general',
      observaciones: 'Continuar con alimentación actual',
      pesoRegistrado: 28.5,
      veterinarioResponsable: 'Dra. Ana Ruiz',
    }) as HistoriaClinicaEntity;

  const mockHistoriaRepo = {
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

    mockHistoriaRepo.create.mockImplementation((data) => ({ ...data }));
    mockHistoriaRepo.save.mockImplementation(async (entity) => ({
      id: entity.id ?? historiaId,
      ...entity,
    }));
    mockHistoriaRepo.merge.mockImplementation((target, changes) =>
      Object.assign(target, changes),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoriasClinicasService,
        {
          provide: getRepositoryToken(HistoriaClinicaEntity),
          useValue: mockHistoriaRepo,
        },
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
      ],
    }).compile();

    service = module.get<HistoriasClinicasService>(HistoriasClinicasService);
  });

  describe('findAll', () => {
    it('returns all clinical records from the repository', async () => {
      const historias = [buildHistoria()];
      mockHistoriaRepo.find.mockResolvedValue(historias);

      await expect(service.findAll(adminUser)).resolves.toEqual(historias);
      expect(mockHistoriaRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('returns the record wrapped in a message', async () => {
      const historia = buildHistoria();
      mockHistoriaRepo.findOne.mockResolvedValue(historia);

      const result = await service.findById(historiaId, adminUser);

      expect(mockHistoriaRepo.findOne).toHaveBeenCalledWith({
        where: { id: historiaId },
      });
      expect(result).toEqual({
        message: 'Historia clínica encontrada',
        data: historia,
      });
    });

    it('throws NotFoundException when the record does not exist', async () => {
      mockHistoriaRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const payload: CreateHistoriaClinicaDto = {
      mascotaId,
      fechaConsulta: '2026-01-15T10:00:00.000Z',
      diagnostico: 'Control de rutina',
      pesoRegistrado: 4.2,
      veterinarioResponsable: 'Dra. Ana Ruiz',
    };

    it('creates a record for an existing pet, converting the date and defaulting observaciones', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload, adminUser);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId },
      });
      const created = mockHistoriaRepo.create.mock.calls[0][0];
      expect(created.fechaConsulta).toBeInstanceOf(Date);
      expect(created.fechaConsulta.toISOString()).toBe(payload.fechaConsulta);
      expect(created.observaciones).toBe('');
      expect(mockHistoriaRepo.save).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Historia clínica creada con éxito');
      expect(result.data).toMatchObject({
        id: historiaId,
        mascotaId,
        diagnostico: 'Control de rutina',
        observaciones: '',
      });
    });

    it('keeps provided observaciones', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      await service.create({ ...payload, observaciones: 'Revisar en 3 meses' }, adminUser);

      expect(mockHistoriaRepo.create.mock.calls[0][0].observaciones).toBe(
        'Revisar en 3 meses',
      );
    });

    it('throws NotFoundException when the pet does not exist', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(payload, adminUser)).rejects.toThrow(NotFoundException);
      expect(mockHistoriaRepo.create).not.toHaveBeenCalled();
      expect(mockHistoriaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('changes only the provided fields', async () => {
      const historia = buildHistoria();
      mockHistoriaRepo.findOne.mockResolvedValue(historia);

      const result = await service.update(historiaId, {
        diagnostico: 'Otitis leve',
        // simulates an omitted field present as undefined on the DTO instance
        observaciones: undefined,
      }, adminUser);

      expect(mockHistoriaRepo.merge).toHaveBeenCalledWith(historia, {
        diagnostico: 'Otitis leve',
      });
      expect(result.message).toBe('Historia clínica actualizada con éxito');
      expect(result.data).toMatchObject({
        diagnostico: 'Otitis leve',
        observaciones: 'Continuar con alimentación actual',
        pesoRegistrado: 28.5,
        veterinarioResponsable: 'Dra. Ana Ruiz',
      });
    });

    it('converts fechaConsulta to a Date when provided', async () => {
      mockHistoriaRepo.findOne.mockResolvedValue(buildHistoria());

      const result = await service.update(historiaId, {
        fechaConsulta: '2026-02-01T08:30:00.000Z',
        pesoRegistrado: 29,
      }, adminUser);

      expect(result.data.fechaConsulta).toBeInstanceOf(Date);
      expect(result.data.fechaConsulta.toISOString()).toBe(
        '2026-02-01T08:30:00.000Z',
      );
      expect(result.data.pesoRegistrado).toBe(29);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      mockHistoriaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { diagnostico: 'x' }, adminUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockHistoriaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing record', async () => {
      mockHistoriaRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(historiaId, adminUser)).resolves.toEqual({
        message: 'Historia clínica eliminada con éxito',
      });
      expect(mockHistoriaRepo.delete).toHaveBeenCalledWith(historiaId);
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      mockHistoriaRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete('missing-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
