import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CitasService } from './citas.service.js';
import { CitaEntity } from './cita.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CreateCitaDto, EstadoCita } from './cita.dto.js';
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
describe('CitasService', () => {
  let service: CitasService;

  const citaId = '7d2c5e9a-1b4f-4c3d-8e6a-2f9b0c7d5e33';
  const mascotaId = '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11';

  const buildCita = (): CitaEntity =>
    ({
      id: citaId,
      mascotaId,
      fechaHora: new Date('2026-12-01T10:00:00.000Z'),
      motivo: 'Control anual',
      lugarveterinaria: 'Clínica Veterinaria Paws',
      estado: EstadoCita.PROGRAMADA,
    }) as CitaEntity;

  const mockCitaRepo = {
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

    mockCitaRepo.create.mockImplementation((data) => ({ ...data }));
    mockCitaRepo.save.mockImplementation(async (entity) => ({
      ...entity,
      id: entity.id ?? citaId,
    }));
    mockCitaRepo.merge.mockImplementation((target, changes) =>
      Object.assign(target, changes),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasService,
        { provide: getRepositoryToken(CitaEntity), useValue: mockCitaRepo },
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
      ],
    }).compile();

    service = module.get<CitasService>(CitasService);
  });

  it('is defined with mocked repositories injected', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CitasService);
  });

  describe('findAll', () => {
    it('returns the appointments from the repository', async () => {
      const citas = [buildCita()];
      mockCitaRepo.find.mockResolvedValue(citas);

      await expect(service.findAll(adminUser)).resolves.toEqual(citas);
      expect(mockCitaRepo.find).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array when there are no appointments', async () => {
      mockCitaRepo.find.mockResolvedValue([]);

      await expect(service.findAll(adminUser)).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns an existing appointment wrapped in a message', async () => {
      const cita = buildCita();
      mockCitaRepo.findOne.mockResolvedValue(cita);

      await expect(service.findById(citaId, adminUser)).resolves.toEqual({
        message: 'Cita encontrada',
        data: cita,
      });
      expect(mockCitaRepo.findOne).toHaveBeenCalledWith({
        where: { id: citaId },
      });
    });

    it('throws NotFoundException when the appointment does not exist', async () => {
      mockCitaRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(citaId, adminUser)).rejects.toThrow(
        new NotFoundException(`Cita con ID ${citaId} no encontrada`),
      );
    });
  });

  describe('create', () => {
    const payload: CreateCitaDto = {
      mascotaId,
      fechaHora: '2026-12-01T10:00:00.000Z',
      motivo: 'Vacunación',
      lugarveterinaria: 'Veterinaria Central',
      estado: EstadoCita.REALIZADA,
    };

    it('creates an appointment associated with an existing pet', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload, adminUser);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId },
      });
      expect(mockCitaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mascotaId,
          motivo: 'Vacunación',
          lugarveterinaria: 'Veterinaria Central',
          estado: EstadoCita.REALIZADA,
        }),
      );
      expect(mockCitaRepo.save).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Cita creada con éxito');
      expect(result.data).toMatchObject({ id: citaId, mascotaId });
    });

    it('throws NotFoundException for an unknown pet and saves nothing', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(payload, adminUser)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${mascotaId} no encontrada`),
      );
      expect(mockCitaRepo.create).not.toHaveBeenCalled();
      expect(mockCitaRepo.save).not.toHaveBeenCalled();
    });

    it('defaults estado to PROGRAMADA when not provided', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });
      const { estado: _, ...withoutEstado } = payload;

      const result = await service.create(withoutEstado, adminUser);

      expect(mockCitaRepo.create.mock.calls[0][0].estado).toBe(
        EstadoCita.PROGRAMADA,
      );
      expect(result.data.estado).toBe(EstadoCita.PROGRAMADA);
    });

    it('converts fechaHora from an ISO string to a Date', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ id: mascotaId });

      const result = await service.create(payload, adminUser);

      const created = mockCitaRepo.create.mock.calls[0][0];
      expect(created.fechaHora).toBeInstanceOf(Date);
      expect(created.fechaHora.toISOString()).toBe(payload.fechaHora);
      expect(result.data.fechaHora).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('changes only the fields explicitly provided', async () => {
      const cita = buildCita();
      mockCitaRepo.findOne.mockResolvedValue(cita);

      const result = await service.update(citaId, {
        estado: EstadoCita.CANCELADA,
        // simulates an omitted field present as undefined on the DTO instance
        motivo: undefined,
      }, adminUser);

      expect(mockCitaRepo.merge).toHaveBeenCalledWith(cita, {
        estado: EstadoCita.CANCELADA,
      });
      expect(result).toEqual({
        message: 'Cita actualizada con éxito',
        data: { ...buildCita(), estado: EstadoCita.CANCELADA },
      });
    });

    it('converts a new fechaHora to a Date', async () => {
      mockCitaRepo.findOne.mockResolvedValue(buildCita());
      const nuevaFecha = '2027-01-15T15:30:00.000Z';

      const result = await service.update(citaId, { fechaHora: nuevaFecha }, adminUser);

      expect(result.data.fechaHora).toBeInstanceOf(Date);
      expect(result.data.fechaHora.toISOString()).toBe(nuevaFecha);
      expect(result.data.motivo).toBe('Control anual');
    });

    it('throws NotFoundException for an unknown appointment', async () => {
      mockCitaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(citaId, { motivo: 'Revisión' }, adminUser),
      ).rejects.toThrow(
        new NotFoundException(`Cita con ID ${citaId} no encontrada`),
      );
      expect(mockCitaRepo.merge).not.toHaveBeenCalled();
      expect(mockCitaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing appointment', async () => {
      mockCitaRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.delete(citaId, adminUser)).resolves.toEqual({
        message: 'Cita eliminada con éxito',
      });
      expect(mockCitaRepo.delete).toHaveBeenCalledWith(citaId);
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      mockCitaRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete(citaId, adminUser)).rejects.toThrow(
        new NotFoundException(`Cita con ID ${citaId} no encontrada`),
      );
    });
  });
});
