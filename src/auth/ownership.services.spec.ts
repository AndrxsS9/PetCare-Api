import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CitasService } from '../citas/citas.service.js';
import { CitaEntity } from '../citas/cita.entity.js';
import { HistoriasClinicasService } from '../historias-clinicas/historias-clinicas.service.js';
import { HistoriaClinicaEntity } from '../historias-clinicas/historia-clinica.entity.js';
import { AlimentacionesService } from '../alimentacion/alimentaciones.service.js';
import { AlimentacionEntity } from '../alimentacion/alimentacion.entity.js';
import { VacunasService } from '../vacunas/vacunas.service.js';
import { VacunaEntity } from '../vacunas/vacuna.entity.js';
import { MedicamentosService } from '../medicamentos/medicamentos.service.js';
import { MedicamentoEntity } from '../medicamentos/medicamento.entity.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Unit tests (mocked repositories) for the ownership rules shared by the five
 * pet-related services. ADMIN behavior is covered by each module's own spec.
 */
const userOf = (rol: RolUsuario, id: string): AuthenticatedUser => ({
  id,
  nombre: rol,
  email: `${id}@petcare.com`,
  telefono: '3000000000',
  rol,
  estado: true,
  mascotas: [],
});

const userA = userOf(RolUsuario.DUENO, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const vet = userOf(RolUsuario.VETERINARIO, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const admin = userOf(RolUsuario.ADMIN, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
const petA = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const petB = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const recordId = 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1';

interface PetRecordService {
  findAll(user: AuthenticatedUser): Promise<unknown[]>;
  findById(id: string, user: AuthenticatedUser): Promise<unknown>;
  create(payload: never, user: AuthenticatedUser): Promise<unknown>;
  update(id: string, changes: never, user: AuthenticatedUser): Promise<unknown>;
  delete(id: string, user: AuthenticatedUser): Promise<unknown>;
}

interface Case {
  name: string;
  service: new (...args: never[]) => PetRecordService;
  entity: object;
  fk: string;
  createPayload: (mascotaId: string) => Record<string, unknown>;
  updatePayload: Record<string, unknown>;
  notFound: string;
}

const cases: Case[] = [
  {
    name: 'CitasService',
    service: CitasService as never,
    entity: CitaEntity,
    fk: 'mascotaId',
    createPayload: (mascotaId) => ({
      mascotaId,
      fechaHora: '2026-12-01T10:00:00.000Z',
      motivo: 'Control',
      lugarveterinaria: 'Clínica',
    }),
    updatePayload: { motivo: 'Cambio' },
    notFound: `Cita con ID ${recordId} no encontrada`,
  },
  {
    name: 'HistoriasClinicasService',
    service: HistoriasClinicasService as never,
    entity: HistoriaClinicaEntity,
    fk: 'mascotaId',
    createPayload: (mascotaId) => ({
      mascotaId,
      fechaConsulta: '2026-11-01T09:00:00.000Z',
      diagnostico: 'Sano',
      pesoRegistrado: 10,
      veterinarioResponsable: 'Dra. Ruiz',
    }),
    updatePayload: { diagnostico: 'Cambio' },
    notFound: `Historia clínica con ID ${recordId} no encontrada`,
  },
  {
    name: 'AlimentacionesService',
    service: AlimentacionesService as never,
    entity: AlimentacionEntity,
    fk: 'mascotaId',
    createPayload: (mascotaId) => ({
      mascotaId,
      tipoAlimento: 'Concentrado',
      marca: 'Marca',
      cantidad: 200,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '08:00',
    }),
    updatePayload: { marca: 'Cambio' },
    notFound: `Alimentación con ID ${recordId} no encontrada`,
  },
  {
    name: 'VacunasService',
    service: VacunasService as never,
    entity: VacunaEntity,
    fk: 'mascota_id',
    createPayload: (mascotaId) => ({
      mascota_id: mascotaId,
      nombreVacuna: 'Rabia',
      fechaAplicacion: '2026-01-10',
      loteVacuna: 'L-1',
      proximaDosis: '2027-01-10',
    }),
    updatePayload: { loteVacuna: 'L-2' },
    notFound: `Vacuna con ID ${recordId} no encontrada`,
  },
  {
    name: 'MedicamentosService',
    service: MedicamentosService as never,
    entity: MedicamentoEntity,
    fk: 'mascotaId',
    createPayload: (mascotaId) => ({
      mascotaId,
      nombreMedicamento: 'Amoxicilina',
      dosis: '1 tableta',
      frecuencia: 'cada 12 horas',
      inicio: '2026-01-10',
      fin: '2026-01-20',
    }),
    updatePayload: { dosis: '2 tabletas' },
    notFound: `Medicamento con ID ${recordId} no encontrado`,
  },
];

describe.each(cases)('$name ownership (unit)', (c) => {
  let service: PetRecordService;

  const recordRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn(),
    delete: vi.fn(),
  };
  const mascotaRepo = { findOne: vi.fn() };
  const scopedTo = (user: AuthenticatedUser) => ({ mascota: { usuarioId: user.id } });

  beforeEach(async () => {
    vi.clearAllMocks();
    recordRepo.create.mockImplementation((data) => ({ ...data }));
    recordRepo.save.mockImplementation(async (e) => ({ ...e, id: e.id ?? recordId }));
    recordRepo.merge.mockImplementation((target, changes) => Object.assign(target, changes));

    const module = await Test.createTestingModule({
      providers: [
        c.service,
        { provide: getRepositoryToken(c.entity as never), useValue: recordRepo },
        { provide: getRepositoryToken(MascotaEntity), useValue: mascotaRepo },
      ],
    }).compile();
    service = module.get(c.service);
  });

  describe('findAll', () => {
    it.each([
      ['DUENO', userA],
      ['VETERINARIO', vet],
    ])('filters by pet owner in the query for %s', async (_rol, user) => {
      recordRepo.find.mockResolvedValue([]);
      await service.findAll(user);
      expect(recordRepo.find).toHaveBeenCalledWith({ where: scopedTo(user) });
    });

    it('applies no filter for ADMIN', async () => {
      recordRepo.find.mockResolvedValue([]);
      await service.findAll(admin);
      expect(recordRepo.find).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('findById', () => {
    it('includes the ownership condition in the lookup', async () => {
      recordRepo.findOne.mockResolvedValue({ id: recordId, [c.fk]: petA });
      await service.findById(recordId, userA);
      expect(recordRepo.findOne).toHaveBeenCalledWith({
        where: { id: recordId, ...scopedTo(userA) },
      });
    });

    it('reports a foreign record exactly like a missing one (404)', async () => {
      recordRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(recordId, userA)).rejects.toThrow(
        new NotFoundException(c.notFound),
      );
    });
  });

  describe('create', () => {
    it("rejects another user's pet with 404 and writes nothing", async () => {
      mascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(c.createPayload(petB) as never, userA)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${petB} no encontrada`),
      );
      expect(mascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: petB, usuarioId: userA.id },
      });
      expect(recordRepo.create).not.toHaveBeenCalled();
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('a veterinarian cannot attach records to an unrelated pet', async () => {
      mascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.create(c.createPayload(petA) as never, vet)).rejects.toThrow(
        NotFoundException,
      );
      expect(mascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: petA, usuarioId: vet.id },
      });
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('creates a record for a pet the user owns', async () => {
      mascotaRepo.findOne.mockResolvedValue({ id: petA, usuarioId: userA.id });

      await service.create(c.createPayload(petA) as never, userA);

      expect(recordRepo.save).toHaveBeenCalledTimes(1);
      expect(recordRepo.create.mock.calls[0][0][c.fk]).toBe(petA);
    });
  });

  describe('update', () => {
    it('verifies ownership before changing anything (foreign → 404, no write)', async () => {
      recordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(recordId, c.updatePayload as never, userA),
      ).rejects.toThrow(new NotFoundException(c.notFound));
      expect(recordRepo.findOne).toHaveBeenCalledWith({
        where: { id: recordId, ...scopedTo(userA) },
      });
      expect(recordRepo.merge).not.toHaveBeenCalled();
      expect(recordRepo.save).not.toHaveBeenCalled();
    });

    it('updates an owned record', async () => {
      recordRepo.findOne.mockResolvedValue({ id: recordId, [c.fk]: petA });

      await service.update(recordId, c.updatePayload as never, userA);

      expect(recordRepo.save).toHaveBeenCalledTimes(1);
    });

    it(`never changes ${c.fk} even if it reaches the service`, async () => {
      const stored = { id: recordId, [c.fk]: petA };
      recordRepo.findOne.mockResolvedValue(stored);

      await service.update(
        recordId,
        { ...c.updatePayload, [c.fk]: petB } as never,
        userA,
      );

      expect(recordRepo.save.mock.calls[0][0][c.fk]).toBe(petA);
    });
  });

  describe('delete', () => {
    it('never deletes a foreign record (404)', async () => {
      recordRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(recordId, userA)).rejects.toThrow(
        new NotFoundException(c.notFound),
      );
      expect(recordRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned record after the scoped lookup', async () => {
      recordRepo.findOne.mockResolvedValue({ id: recordId, [c.fk]: petA });
      recordRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.delete(recordId, userA);

      expect(recordRepo.findOne).toHaveBeenCalledWith({
        where: { id: recordId, ...scopedTo(userA) },
      });
      expect(recordRepo.delete).toHaveBeenCalledWith(recordId);
    });

    it('ADMIN deletes directly by id', async () => {
      recordRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.delete(recordId, admin);

      expect(recordRepo.findOne).not.toHaveBeenCalled();
      expect(recordRepo.delete).toHaveBeenCalledWith(recordId);
    });
  });
});
