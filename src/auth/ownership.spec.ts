import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CitaEntity } from '../citas/cita.entity.js';
import { HistoriaClinicaEntity } from '../historias-clinicas/historia-clinica.entity.js';
import { AlimentacionEntity } from '../alimentacion/alimentacion.entity.js';
import { VacunaEntity } from '../vacunas/vacuna.entity.js';
import { MedicamentoEntity } from '../medicamentos/medicamento.entity.js';
import type { AuthenticatedUser } from './auth.types.js';
import {
  deletePetRecord,
  findAccessibleMascota,
  isAdmin,
  petOwnershipWhere,
  petRecordOwnershipWhere,
} from './ownership.js';

const userOf = (rol: RolUsuario, id: string): AuthenticatedUser => ({
  id,
  nombre: rol,
  email: `${rol.toLowerCase()}@petcare.com`,
  telefono: '3000000000',
  rol,
  estado: true,
  mascotas: [],
});

const dueno = userOf(RolUsuario.DUENO, '11111111-1111-4111-8111-111111111111');
const vet = userOf(RolUsuario.VETERINARIO, '22222222-2222-4222-8222-222222222222');
const admin = userOf(RolUsuario.ADMIN, '33333333-3333-4333-8333-333333333333');
const mascotaId = '44444444-4444-4444-8444-444444444444';
const recordId = '55555555-5555-4555-8555-555555555555';

describe('ownership policy helpers', () => {
  describe('isAdmin', () => {
    it('is true only for ADMIN', () => {
      expect(isAdmin(admin)).toBe(true);
      expect(isAdmin(dueno)).toBe(false);
      expect(isAdmin(vet)).toBe(false);
    });
  });

  describe('petOwnershipWhere', () => {
    it('does not restrict ADMIN', () => {
      expect(petOwnershipWhere(admin)).toEqual({});
    });

    it('restricts DUENO and VETERINARIO to pets they own', () => {
      expect(petOwnershipWhere(dueno)).toEqual({ usuarioId: dueno.id });
      expect(petOwnershipWhere(vet)).toEqual({ usuarioId: vet.id });
    });
  });

  describe('petRecordOwnershipWhere', () => {
    it('does not restrict ADMIN', () => {
      expect(petRecordOwnershipWhere<CitaEntity>(admin)).toEqual({});
    });

    it('restricts DUENO and VETERINARIO through the pet relation', () => {
      expect(petRecordOwnershipWhere<CitaEntity>(dueno)).toEqual({
        mascota: { usuarioId: dueno.id },
      });
      expect(petRecordOwnershipWhere<CitaEntity>(vet)).toEqual({
        mascota: { usuarioId: vet.id },
      });
    });
  });

  describe('findAccessibleMascota', () => {
    const repo = { findOne: vi.fn() };
    const asRepo = repo as unknown as Repository<MascotaEntity>;
    beforeEach(() => vi.clearAllMocks());

    it('looks the pet up by id only for ADMIN', async () => {
      repo.findOne.mockResolvedValue({ id: mascotaId });
      await findAccessibleMascota(asRepo, mascotaId, admin);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: mascotaId } });
    });

    it('adds the owner condition for regular users', async () => {
      repo.findOne.mockResolvedValue({ id: mascotaId, usuarioId: dueno.id });
      const result = await findAccessibleMascota(asRepo, mascotaId, dueno);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mascotaId, usuarioId: dueno.id },
      });
      expect(result.id).toBe(mascotaId);
    });

    it('throws the same 404 for unknown and foreign pets', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(findAccessibleMascota(asRepo, mascotaId, dueno)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${mascotaId} no encontrada`),
      );
    });
  });

  describe('deletePetRecord', () => {
    const repo = { findOne: vi.fn(), delete: vi.fn() };
    const asRepo = repo as unknown as Repository<CitaEntity>;
    beforeEach(() => vi.clearAllMocks());

    it('ADMIN deletes with a single statement and no ownership lookup', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });
      await expect(deletePetRecord(asRepo, recordId, admin)).resolves.toEqual({
        affected: 1,
        raw: [],
      });
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith(recordId);
    });

    it('a regular user deletes only after the scoped lookup finds the record', async () => {
      repo.findOne.mockResolvedValue({ id: recordId });
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await deletePetRecord(asRepo, recordId, dueno);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: recordId, mascota: { usuarioId: dueno.id } },
      });
      expect(repo.delete).toHaveBeenCalledWith(recordId);
    });

    it('a foreign or missing record is never deleted', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(deletePetRecord(asRepo, recordId, vet)).resolves.toEqual({ affected: 0 });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});

/**
 * Builds real TypeORM metadata for the Postgres driver without opening a
 * connection, and inspects the SQL that the ownership filters produce. This
 * proves the restriction is enforced by the database query, not in memory.
 */
describe('ownership filters → generated SQL (no database connection)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      entities: [
        UsuarioEntity,
        MascotaEntity,
        CitaEntity,
        HistoriaClinicaEntity,
        AlimentacionEntity,
        VacunaEntity,
        MedicamentoEntity,
      ],
    });
    // Public at runtime, protected in the typings; only builds metadata.
    await (dataSource as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
    expect(dataSource.isInitialized).toBe(false);
  });

  const sqlFor = (entity: Parameters<DataSource['getRepository']>[0], where: object) =>
    dataSource.getRepository(entity).createQueryBuilder().setFindOptions({ where }).getQueryAndParameters();

  it.each([
    ['citas', CitaEntity, '"mascotaId"'],
    ['historias_clinicas', HistoriaClinicaEntity, '"mascotaId"'],
    ['alimentaciones', AlimentacionEntity, '"mascotaId"'],
    ['vacunas', VacunaEntity, '"mascota_id"'],
    ['medicamentos', MedicamentoEntity, '"mascotaId"'],
  ])('%s: joins mascotas and filters by the owner in WHERE', (table, entity, fkColumn) => {
    const [sql, params] = sqlFor(entity, {
      id: recordId,
      ...petRecordOwnershipWhere(dueno),
    });

    expect(sql).toContain(`FROM "${table}"`);
    expect(sql).toMatch(new RegExp(`JOIN "mascotas" "(\\w+)" ON "\\1"\\."id"="\\w+"\\.${fkColumn}`));
    expect(sql).toMatch(/WHERE .*"id" = \$1.*"usuarioId" = \$2/);
    expect(params).toEqual([recordId, dueno.id]);
    // The join is used only for filtering: no pet columns are selected.
    expect(sql.split(' FROM ')[0]).not.toContain('usuarioId');
  });

  it('mascotas: filters by usuarioId in WHERE', () => {
    const [sql, params] = sqlFor(MascotaEntity, { id: mascotaId, ...petOwnershipWhere(dueno) });
    expect(sql).toMatch(/WHERE .*"id" = \$1.*"usuarioId" = \$2/);
    expect(params).toEqual([mascotaId, dueno.id]);
  });

  it('ADMIN adds no condition at all', () => {
    const [sql, params] = sqlFor(CitaEntity, petRecordOwnershipWhere(admin));
    expect(sql).not.toContain('WHERE');
    expect(sql).not.toContain('JOIN');
    expect(params).toEqual([]);
  });
});
