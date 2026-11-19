import { randomUUID } from 'node:crypto';
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { MascotasController } from '../mascotas/mascotas.controller.js';
import { MascotasService } from '../mascotas/mascotas.service.js';
import { CitaEntity } from '../citas/cita.entity.js';
import { CitasController } from '../citas/citas.controller.js';
import { CitasService } from '../citas/citas.service.js';
import { HistoriaClinicaEntity } from '../historias-clinicas/historia-clinica.entity.js';
import { HistoriasClinicasController } from '../historias-clinicas/historias-clinicas.controller.js';
import { HistoriasClinicasService } from '../historias-clinicas/historias-clinicas.service.js';
import { AlimentacionEntity } from '../alimentacion/alimentacion.entity.js';
import { AlimentacionController } from '../alimentacion/alimentacion.controller.js';
import { AlimentacionesService } from '../alimentacion/alimentaciones.service.js';
import { VacunaEntity } from '../vacunas/vacuna.entity.js';
import { VacunasController } from '../vacunas/vacunas.controller.js';
import { VacunasService } from '../vacunas/vacunas.service.js';
import { MedicamentoEntity } from '../medicamentos/medicamento.entity.js';
import { MedicamentosController } from '../medicamentos/medicamentos.controller.js';
import { MedicamentosService } from '../medicamentos/medicamentos.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { jwtModuleAsyncOptions } from './jwt.config.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/* -------------------------------------------------------------------------- */
/* In-memory stand-in for the TypeORM repositories                            */
/* -------------------------------------------------------------------------- */

type Row = Record<string, unknown> & { id: string };

interface TableDef {
  /** relation property → { table it points to, local FK column } */
  relations: Record<string, { table: string; fk: string }>;
}

const TABLES: Record<string, TableDef> = {
  usuarios: { relations: {} },
  mascotas: { relations: { usuario: { table: 'usuarios', fk: 'usuarioId' } } },
  citas: { relations: { mascota: { table: 'mascotas', fk: 'mascotaId' } } },
  historias_clinicas: { relations: { mascota: { table: 'mascotas', fk: 'mascotaId' } } },
  alimentaciones: { relations: { mascota: { table: 'mascotas', fk: 'mascotaId' } } },
  vacunas: { relations: { mascota: { table: 'mascotas', fk: 'mascota_id' } } },
  medicamentos: { relations: { mascota: { table: 'mascotas', fk: 'mascotaId' } } },
};

/**
 * Supports exactly the repository calls the services make: equality `where`
 * (including nested relation conditions, like TypeORM's join filters),
 * `relations`, create/merge/save, delete by id and remove. Deletes emulate the
 * real `ON DELETE CASCADE` foreign keys. Anything else throws, so a service
 * using an unsupported query shape cannot pass silently.
 */
class FakeDb {
  tables: Record<string, Map<string, Row>> = {};

  constructor() {
    this.reset();
  }

  reset() {
    for (const name of Object.keys(TABLES)) this.tables[name] = new Map();
  }

  insert(table: string, row: Row) {
    this.tables[table].set(row.id, structuredClone(row));
  }

  get(table: string, id: string): Row | undefined {
    const row = this.tables[table].get(id);
    return row ? structuredClone(row) : undefined;
  }

  count(table: string) {
    return this.tables[table].size;
  }

  snapshot(): string {
    return JSON.stringify(
      Object.fromEntries(Object.entries(this.tables).map(([k, v]) => [k, [...v.entries()]])),
    );
  }

  matches(table: string, row: Row, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => {
      const relation = TABLES[table].relations[key];
      if (relation) {
        if (!value || typeof value !== 'object') throw new Error(`Unsupported where on ${key}`);
        const related = this.tables[relation.table].get(row[relation.fk] as string);
        return !!related && this.matches(relation.table, related, value as Record<string, unknown>);
      }
      if (value !== null && typeof value === 'object') {
        throw new Error(`Unsupported operator in where.${key}`);
      }
      return row[key] === value;
    });
  }

  deleteCascade(table: string, id: string): boolean {
    if (!this.tables[table].delete(id)) return false;
    for (const [child, def] of Object.entries(TABLES)) {
      for (const rel of Object.values(def.relations)) {
        if (rel.table !== table) continue;
        // Copy first: the recursive call deletes from these maps while iterating.
        for (const row of Array.from(this.tables[child].values())) {
          if (row[rel.fk] === id) this.deleteCascade(child, row.id);
        }
      }
    }
    return true;
  }

  repository(table: string) {
    const def = TABLES[table];
    const hydrate = (row: Row, relations?: Record<string, boolean>) => {
      const result: Record<string, unknown> = structuredClone(row);
      for (const [key, enabled] of Object.entries(relations ?? {})) {
        const rel = def.relations[key];
        if (!enabled || !rel) throw new Error(`Unsupported relation ${key}`);
        result[key] = this.get(rel.table, row[rel.fk] as string) ?? null;
      }
      return result;
    };
    const select = (opts: { where?: Record<string, unknown>; relations?: Record<string, boolean> } = {}) =>
      [...this.tables[table].values()]
        .filter((row) => this.matches(table, row, opts.where ?? {}))
        .map((row) => hydrate(row, opts.relations));

    return {
      find: async (opts?: Parameters<typeof select>[0]) => select(opts),
      findOne: async (opts: Parameters<typeof select>[0]) => select(opts)[0] ?? null,
      create: (data: Record<string, unknown>) => ({ ...data }),
      merge: (target: object, ...sources: object[]) => Object.assign(target, ...sources),
      save: async (entity: Record<string, unknown>) => {
        entity.id ??= randomUUID();
        const row = { ...entity } as Row;
        for (const key of Object.keys(def.relations)) delete row[key];
        this.insert(table, row);
        return entity;
      },
      delete: async (criteria: unknown) => {
        if (typeof criteria !== 'string') throw new Error('Only delete(id) is supported');
        return { affected: this.deleteCascade(table, criteria) ? 1 : 0, raw: [] };
      },
      remove: async (entity: Row) => {
        this.deleteCascade(table, entity.id);
        return entity;
      },
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const TEST_SECRET = 'ownership-http-test-only-key-Lp4Qs8Tv2Xz6Bn0M';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: { get: (key: string) => (key === 'JWT_SECRET' ? TEST_SECRET : undefined) },
    },
  ],
  exports: [ConfigService],
})
class TestConfigModule {}

const ids = {
  userA: 'a0000000-0000-4000-8000-00000000000a',
  userB: 'b0000000-0000-4000-8000-00000000000b',
  admin: 'd0000000-0000-4000-8000-00000000000d',
  vet: 'c0000000-0000-4000-8000-00000000000c',
  petA: 'a1000000-0000-4000-8000-0000000000a1',
  petB: 'b1000000-0000-4000-8000-0000000000b1',
  missing: '99999999-9999-4999-8999-999999999999',
};

const users: Row[] = [
  { id: ids.userA, nombre: 'User A', email: 'a@petcare.com', rol: RolUsuario.DUENO },
  { id: ids.userB, nombre: 'User B', email: 'b@petcare.com', rol: RolUsuario.DUENO },
  { id: ids.admin, nombre: 'Admin', email: 'admin@petcare.com', rol: RolUsuario.ADMIN },
  { id: ids.vet, nombre: 'Vet', email: 'vet@petcare.com', rol: RolUsuario.VETERINARIO },
].map((u) => ({ ...u, password: '$2b$10$storedHashMustNeverLeak', telefono: '3000000000', estado: true }));

const pet = (id: string, usuarioId: string, nombre: string): Row => ({
  id,
  usuarioId,
  nombre,
  especie: 'PERRO',
  raza: 'Criollo',
  fecha_nacimiento: '2021-01-01',
  peso: 10,
  fotoUrl: '',
  estado: true,
});

interface ResourceCase {
  name: string;
  url: string;
  table: string;
  fk: string;
  recA: string;
  recB: string;
  seed: (id: string, mascotaId: string) => Row;
  createBody: (mascotaId: string) => Record<string, unknown>;
  updateBody: Record<string, unknown>;
  messages: { found: string; created: string; updated: string; deleted: string };
  notFound: (id: string) => string;
}

const resources: ResourceCase[] = [
  {
    name: 'Citas',
    url: '/citas',
    table: 'citas',
    fk: 'mascotaId',
    recA: 'a2000000-0000-4000-8000-0000000000a2',
    recB: 'b2000000-0000-4000-8000-0000000000b2',
    seed: (id, mascotaId) => ({
      id,
      mascotaId,
      fechaHora: '2026-12-01T10:00:00.000Z',
      motivo: 'Control',
      lugarveterinaria: 'Clínica',
      estado: 'PROGRAMADA',
    }),
    createBody: (mascotaId) => ({
      mascotaId,
      fechaHora: '2026-12-05T10:00:00.000Z',
      motivo: 'Vacunación',
      lugarveterinaria: 'Clínica Central',
    }),
    updateBody: { motivo: 'Motivo actualizado' },
    messages: {
      found: 'Cita encontrada',
      created: 'Cita creada con éxito',
      updated: 'Cita actualizada con éxito',
      deleted: 'Cita eliminada con éxito',
    },
    notFound: (id) => `Cita con ID ${id} no encontrada`,
  },
  {
    name: 'Historias Clínicas',
    url: '/historias-clinicas',
    table: 'historias_clinicas',
    fk: 'mascotaId',
    recA: 'a3000000-0000-4000-8000-0000000000a3',
    recB: 'b3000000-0000-4000-8000-0000000000b3',
    seed: (id, mascotaId) => ({
      id,
      mascotaId,
      fechaConsulta: '2026-10-01T09:00:00.000Z',
      diagnostico: 'Sano',
      observaciones: '',
      pesoRegistrado: 10,
      veterinarioResponsable: 'Dra. Ruiz',
    }),
    createBody: (mascotaId) => ({
      mascotaId,
      fechaConsulta: '2026-11-01T09:00:00.000Z',
      diagnostico: 'Otitis',
      pesoRegistrado: 11,
      veterinarioResponsable: 'Dr. Pérez',
    }),
    updateBody: { diagnostico: 'Diagnóstico actualizado' },
    messages: {
      found: 'Historia clínica encontrada',
      created: 'Historia clínica creada con éxito',
      updated: 'Historia clínica actualizada con éxito',
      deleted: 'Historia clínica eliminada con éxito',
    },
    notFound: (id) => `Historia clínica con ID ${id} no encontrada`,
  },
  {
    name: 'Alimentación',
    url: '/alimentaciones',
    table: 'alimentaciones',
    fk: 'mascotaId',
    recA: 'a4000000-0000-4000-8000-0000000000a4',
    recB: 'b4000000-0000-4000-8000-0000000000b4',
    seed: (id, mascotaId) => ({
      id,
      mascotaId,
      tipoAlimento: 'Concentrado',
      marca: 'Marca',
      cantidad: 200,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '08:00',
      observaciones: '',
    }),
    createBody: (mascotaId) => ({
      mascotaId,
      tipoAlimento: 'Húmedo',
      marca: 'Otra',
      cantidad: 100,
      unidad: 'gramos',
      frecuencia: '1 vez al día',
      horario: '18:00',
    }),
    updateBody: { marca: 'Marca actualizada' },
    messages: {
      found: 'Alimentación encontrada',
      created: 'Alimentación creada con éxito',
      updated: 'Alimentación actualizada con éxito',
      deleted: 'Alimentación eliminada con éxito',
    },
    notFound: (id) => `Alimentación con ID ${id} no encontrada`,
  },
  {
    name: 'Vacunas',
    url: '/vacunas',
    table: 'vacunas',
    fk: 'mascota_id',
    recA: 'a5000000-0000-4000-8000-0000000000a5',
    recB: 'b5000000-0000-4000-8000-0000000000b5',
    seed: (id, mascota_id) => ({
      id,
      mascota_id,
      nombreVacuna: 'Rabia',
      fechaAplicacion: '2026-01-10',
      loteVacuna: 'L-1',
      observaciones: '',
      proximaDosis: '2027-01-10',
    }),
    createBody: (mascota_id) => ({
      mascota_id,
      nombreVacuna: 'Parvovirus',
      fechaAplicacion: '2026-02-10',
      loteVacuna: 'P-9',
      proximaDosis: '2027-02-10',
    }),
    updateBody: { loteVacuna: 'L-2' },
    messages: {
      found: 'Vacuna encontrada',
      created: 'Vacuna registrada con éxito',
      updated: 'Vacuna actualizada con éxito',
      deleted: 'Vacuna eliminada con éxito',
    },
    notFound: (id) => `Vacuna con ID ${id} no encontrada`,
  },
  {
    name: 'Medicamentos',
    url: '/medicamentos',
    table: 'medicamentos',
    fk: 'mascotaId',
    recA: 'a6000000-0000-4000-8000-0000000000a6',
    recB: 'b6000000-0000-4000-8000-0000000000b6',
    seed: (id, mascotaId) => ({
      id,
      mascotaId,
      nombreMedicamento: 'Amoxicilina',
      dosis: '1 tableta',
      frecuencia: 'cada 12 horas',
      inicio: '2026-01-10',
      fin: '2026-01-20',
      observaciones: '',
      estado: true,
    }),
    createBody: (mascotaId) => ({
      mascotaId,
      nombreMedicamento: 'Meloxicam',
      dosis: '0.5 ml',
      frecuencia: 'cada 24 horas',
      inicio: '2026-03-01',
      fin: '2026-03-05',
    }),
    updateBody: { dosis: '2 tabletas' },
    messages: {
      found: 'Medicamento encontrado',
      created: 'Medicamento creado con éxito',
      updated: 'Medicamento actualizado con éxito',
      deleted: 'Medicamento eliminado con éxito',
    },
    notFound: (id) => `Medicamento con ID ${id} no encontrado`,
  },
];

/* -------------------------------------------------------------------------- */
/* Application                                                                */
/* -------------------------------------------------------------------------- */

describe('Resource ownership (HTTP, real guards + services, in-memory data)', () => {
  const db = new FakeDb();
  let app: INestApplication;
  let jwt: JwtService;
  const tokens: Record<'userA' | 'userB' | 'admin' | 'vet', string> = {} as never;

  const http = () => request(app.getHttpServer());
  const as = (who: keyof typeof tokens) => ({ Authorization: `Bearer ${tokens[who]}` });

  const seed = () => {
    db.reset();
    users.forEach((u) => db.insert('usuarios', u));
    db.insert('mascotas', pet(ids.petA, ids.userA, 'Firulais'));
    db.insert('mascotas', pet(ids.petB, ids.userB, 'Michi'));
    for (const r of resources) {
      db.insert(r.table, r.seed(r.recA, ids.petA));
      db.insert(r.table, r.seed(r.recB, ids.petB));
    }
  };

  beforeAll(async () => {
    const usuarioRepo = db.repository('usuarios');
    const module = await Test.createTestingModule({
      imports: [
        TestConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.registerAsync(jwtModuleAsyncOptions),
      ],
      controllers: [
        MascotasController,
        CitasController,
        HistoriasClinicasController,
        AlimentacionController,
        VacunasController,
        MedicamentosController,
      ],
      providers: [
        MascotasService,
        CitasService,
        HistoriasClinicasService,
        AlimentacionesService,
        VacunasService,
        MedicamentosService,
        JwtStrategy,
        {
          // Only what JwtStrategy needs: reload the user without the hash.
          provide: UsuariosService,
          useValue: {
            findSafeById: async (id: string) => {
              const u = (await usuarioRepo.findOne({ where: { id } })) as Row | null;
              if (!u) return null;
              const { password: _, ...safe } = u;
              return safe;
            },
          },
        },
        { provide: getRepositoryToken(UsuarioEntity), useValue: usuarioRepo },
        { provide: getRepositoryToken(MascotaEntity), useValue: db.repository('mascotas') },
        { provide: getRepositoryToken(CitaEntity), useValue: db.repository('citas') },
        {
          provide: getRepositoryToken(HistoriaClinicaEntity),
          useValue: db.repository('historias_clinicas'),
        },
        { provide: getRepositoryToken(AlimentacionEntity), useValue: db.repository('alimentaciones') },
        { provide: getRepositoryToken(VacunaEntity), useValue: db.repository('vacunas') },
        { provide: getRepositoryToken(MedicamentoEntity), useValue: db.repository('medicamentos') },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    // Same options as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    jwt = module.get(JwtService);
    const sign = (id: string) => {
      const u = users.find((x) => x.id === id)!;
      return jwt.sign({ sub: u.id, email: u.email, rol: u.rol });
    };
    tokens.userA = sign(ids.userA);
    tokens.userB = sign(ids.userB);
    tokens.admin = sign(ids.admin);
    tokens.vet = sign(ids.vet);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(seed);

  /* ------------------------------------------------------------------------ */
  /* Pet-related resources: identical policy for all five modules             */
  /* ------------------------------------------------------------------------ */

  describe.each(resources)('$name ($url)', (r) => {
    const byId = (id: string) => `${r.url}/${id}`;
    const listIds = (body: { id: string }[]) => body.map((x) => x.id).sort();

    describe('anonymous requests (401, no mutation)', () => {
      it('GET collection and GET by id return 401', async () => {
        await http().get(r.url).expect(401);
        await http().get(byId(r.recA)).expect(401);
      });

      it('POST, PUT and DELETE return 401 and change nothing', async () => {
        const before = db.snapshot();
        await http().post(r.url).send(r.createBody(ids.petA)).expect(401);
        await http().put(byId(r.recA)).send(r.updateBody).expect(401);
        await http().delete(byId(r.recA)).expect(401);
        expect(db.snapshot()).toBe(before);
      });
    });

    describe('GET collection', () => {
      it("User A sees only records of their own pets (never User B's)", async () => {
        const res = await http().get(r.url).set(as('userA')).expect(200);
        expect(listIds(res.body)).toEqual([r.recA]);
      });

      it('User B sees only their own records', async () => {
        const res = await http().get(r.url).set(as('userB')).expect(200);
        expect(listIds(res.body)).toEqual([r.recB]);
      });

      it('a veterinarian without an assignment model sees nothing', async () => {
        const res = await http().get(r.url).set(as('vet')).expect(200);
        expect(res.body).toEqual([]);
      });

      it('ADMIN sees every record', async () => {
        const res = await http().get(r.url).set(as('admin')).expect(200);
        expect(listIds(res.body)).toEqual([r.recA, r.recB].sort());
      });
    });

    describe('GET by id', () => {
      it('User A can read their own record with the usual contract', async () => {
        const res = await http().get(byId(r.recA)).set(as('userA')).expect(200);
        expect(res.body.message).toBe(r.messages.found);
        expect(res.body.data).toMatchObject({ id: r.recA, [r.fk]: ids.petA });
      });

      it("User A gets 404 for User B's record, identical to a missing one", async () => {
        const foreign = await http().get(byId(r.recB)).set(as('userA')).expect(404);
        const missing = await http().get(byId(ids.missing)).set(as('userA')).expect(404);
        expect(foreign.body.message).toBe(r.notFound(r.recB));
        expect({ ...foreign.body, message: undefined }).toEqual({ ...missing.body, message: undefined });
      });

      it('a veterinarian gets 404 for an unrelated pet record', async () => {
        await http().get(byId(r.recA)).set(as('vet')).expect(404);
      });

      it("ADMIN can read anyone's record", async () => {
        const res = await http().get(byId(r.recB)).set(as('admin')).expect(200);
        expect(res.body.data.id).toBe(r.recB);
      });

      it('an invalid UUID still returns 400', async () => {
        await http().get(byId('not-a-uuid')).set(as('userA')).expect(400);
      });
    });

    describe('POST', () => {
      it('User A creates a record for their own pet', async () => {
        const res = await http().post(r.url).set(as('userA')).send(r.createBody(ids.petA)).expect(201);
        expect(res.body.message).toBe(r.messages.created);
        expect(res.body.data[r.fk]).toBe(ids.petA);
        expect(db.count(r.table)).toBe(3);
        expect(db.get(r.table, res.body.data.id)?.[r.fk]).toBe(ids.petA);
      });

      it("User A cannot use User B's pet UUID (404, nothing stored)", async () => {
        const before = db.snapshot();
        const res = await http().post(r.url).set(as('userA')).send(r.createBody(ids.petB)).expect(404);
        expect(res.body.message).toBe(`Mascota con ID ${ids.petB} no encontrada`);
        expect(db.snapshot()).toBe(before);
      });

      it('a veterinarian cannot create records for an unrelated pet', async () => {
        const before = db.snapshot();
        await http().post(r.url).set(as('vet')).send(r.createBody(ids.petA)).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('an unknown pet still returns 404', async () => {
        await http().post(r.url).set(as('userA')).send(r.createBody(ids.missing)).expect(404);
      });

      it('extra ownership fields in the body are rejected (400), not trusted', async () => {
        const before = db.snapshot();
        await http()
          .post(r.url)
          .set(as('userA'))
          .send({ ...r.createBody(ids.petB), usuarioId: ids.userA })
          .expect(400);
        expect(db.snapshot()).toBe(before);
      });

      it('DTO validation is unchanged (missing pet id → 400)', async () => {
        const { [r.fk]: _, ...withoutPet } = r.createBody(ids.petA);
        await http().post(r.url).set(as('userA')).send(withoutPet).expect(400);
      });

      it("ADMIN can create records for any existing pet", async () => {
        const res = await http().post(r.url).set(as('admin')).send(r.createBody(ids.petB)).expect(201);
        expect(res.body.data[r.fk]).toBe(ids.petB);
      });
    });

    describe('PUT', () => {
      it('User A updates their own record', async () => {
        const res = await http().put(byId(r.recA)).set(as('userA')).send(r.updateBody).expect(200);
        expect(res.body.message).toBe(r.messages.updated);
        expect(db.get(r.table, r.recA)).toMatchObject(r.updateBody);
      });

      it("User A cannot update User B's record (404, unchanged)", async () => {
        const before = db.snapshot();
        await http().put(byId(r.recB)).set(as('userA')).send(r.updateBody).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it(`User A cannot move a record to another pet through ${r.fk} (400, unchanged)`, async () => {
        const before = db.snapshot();
        await http()
          .put(byId(r.recA))
          .set(as('userA'))
          .send({ ...r.updateBody, [r.fk]: ids.petB })
          .expect(400);
        expect(db.snapshot()).toBe(before);
      });

      it('a veterinarian cannot update unrelated records', async () => {
        const before = db.snapshot();
        await http().put(byId(r.recA)).set(as('vet')).send(r.updateBody).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it("ADMIN can update anyone's record", async () => {
        await http().put(byId(r.recB)).set(as('admin')).send(r.updateBody).expect(200);
        expect(db.get(r.table, r.recB)).toMatchObject(r.updateBody);
      });

      it('an invalid UUID still returns 400', async () => {
        await http().put(byId('not-a-uuid')).set(as('admin')).send(r.updateBody).expect(400);
      });
    });

    describe('DELETE', () => {
      it("User A cannot delete User B's record (404, still stored)", async () => {
        const before = db.snapshot();
        await http().delete(byId(r.recB)).set(as('userA')).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('a veterinarian cannot delete unrelated records', async () => {
        await http().delete(byId(r.recA)).set(as('vet')).expect(404);
        expect(db.get(r.table, r.recA)).toBeDefined();
      });

      it('User A deletes their own record', async () => {
        const res = await http().delete(byId(r.recA)).set(as('userA')).expect(200);
        expect(res.body).toEqual({ message: r.messages.deleted });
        expect(db.get(r.table, r.recA)).toBeUndefined();
        expect(db.get(r.table, r.recB)).toBeDefined();
      });

      it("ADMIN can delete anyone's record", async () => {
        await http().delete(byId(r.recB)).set(as('admin')).expect(200);
        expect(db.get(r.table, r.recB)).toBeUndefined();
      });

      it('an invalid UUID still returns 400', async () => {
        await http().delete(byId('not-a-uuid')).set(as('admin')).expect(400);
      });
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Mascotas                                                                 */
  /* ------------------------------------------------------------------------ */

  describe('Mascotas (/mascotas)', () => {
    const newPet = { nombre: 'Rocky', especie: 'PERRO', raza: 'Beagle', fecha_nacimiento: '2023-04-01', peso: 8 };

    it('anonymous requests get 401 and change nothing', async () => {
      const before = db.snapshot();
      await http().get('/mascotas').expect(401);
      await http().get(`/mascotas/${ids.petA}`).expect(401);
      await http().post('/mascotas').send(newPet).expect(401);
      await http().put(`/mascotas/${ids.petA}`).send({ nombre: 'X' }).expect(401);
      await http().delete(`/mascotas/${ids.petA}`).expect(401);
      expect(db.snapshot()).toBe(before);
    });

    describe('GET', () => {
      it('User A lists only their pets, with the owner sanitized', async () => {
        const res = await http().get('/mascotas').set(as('userA')).expect(200);
        expect(res.body.map((m: Row) => m.id)).toEqual([ids.petA]);
        expect(res.body[0].usuario.id).toBe(ids.userA);
        expect(res.body[0].usuario).not.toHaveProperty('password');
        expect(JSON.stringify(res.body)).not.toContain('storedHashMustNeverLeak');
      });

      it('a veterinarian lists no pets; ADMIN lists all', async () => {
        expect((await http().get('/mascotas').set(as('vet')).expect(200)).body).toEqual([]);
        const all = await http().get('/mascotas').set(as('admin')).expect(200);
        expect(all.body.map((m: Row) => m.id).sort()).toEqual([ids.petA, ids.petB].sort());
      });

      it("User A gets 404 for User B's pet; ADMIN gets 200", async () => {
        const res = await http().get(`/mascotas/${ids.petB}`).set(as('userA')).expect(404);
        expect(res.body.message).toBe(`Mascota con ID ${ids.petB} no encontrada`);
        await http().get(`/mascotas/${ids.petB}`).set(as('admin')).expect(200);
      });

      it('User A reads their own pet with the usual contract', async () => {
        const res = await http().get(`/mascotas/${ids.petA}`).set(as('userA')).expect(200);
        expect(res.body.message).toBe('Mascota encontrada');
        expect(res.body.data.usuario).not.toHaveProperty('password');
      });

      it('a veterinarian gets 404 for an unrelated pet', async () => {
        await http().get(`/mascotas/${ids.petA}`).set(as('vet')).expect(404);
      });

      it('an invalid UUID returns 400', async () => {
        await http().get('/mascotas/not-a-uuid').set(as('userA')).expect(400);
      });
    });

    describe('POST', () => {
      it('User A registers a pet without usuarioId → owned by User A', async () => {
        const res = await http().post('/mascotas').set(as('userA')).send(newPet).expect(201);
        expect(res.body.message).toBe('Mascota creada con éxito');
        expect(res.body.data.usuarioId).toBe(ids.userA);
        expect(res.body.data.usuario).not.toHaveProperty('password');
        expect(db.get('mascotas', res.body.data.id)?.usuarioId).toBe(ids.userA);
      });

      it('User A may send their own usuarioId', async () => {
        const res = await http()
          .post('/mascotas')
          .set(as('userA'))
          .send({ ...newPet, usuarioId: ids.userA })
          .expect(201);
        expect(res.body.data.usuarioId).toBe(ids.userA);
      });

      it.each(['userA', 'vet'] as const)(
        '%s cannot register a pet for another user (403, nothing stored)',
        async (who) => {
          const before = db.snapshot();
          await http()
            .post('/mascotas')
            .set(as(who))
            .send({ ...newPet, usuarioId: ids.userB })
            .expect(403);
          expect(db.snapshot()).toBe(before);
        },
      );

      it('ADMIN can register a pet for an existing user', async () => {
        const res = await http()
          .post('/mascotas')
          .set(as('admin'))
          .send({ ...newPet, usuarioId: ids.userB })
          .expect(201);
        expect(res.body.data.usuarioId).toBe(ids.userB);
      });

      it('ADMIN gets 404 for a non-existent owner', async () => {
        const before = db.snapshot();
        await http()
          .post('/mascotas')
          .set(as('admin'))
          .send({ ...newPet, usuarioId: ids.missing })
          .expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('DTO validation is unchanged (invalid usuarioId / missing nombre → 400)', async () => {
        await http().post('/mascotas').set(as('userA')).send({ ...newPet, usuarioId: 'x' }).expect(400);
        const { nombre: _, ...noName } = newPet;
        await http().post('/mascotas').set(as('userA')).send(noName).expect(400);
      });
    });

    describe('PUT', () => {
      it('User A updates their own pet (partial update preserved)', async () => {
        const res = await http().put(`/mascotas/${ids.petA}`).set(as('userA')).send({ peso: 12.5 }).expect(200);
        expect(res.body.message).toBe('Mascota actualizada con éxito');
        expect(db.get('mascotas', ids.petA)).toMatchObject({ peso: 12.5, nombre: 'Firulais' });
      });

      it('User A cannot transfer their pet to User B (403, unchanged)', async () => {
        const before = db.snapshot();
        await http()
          .put(`/mascotas/${ids.petA}`)
          .set(as('userA'))
          .send({ nombre: 'Cambiado', usuarioId: ids.userB })
          .expect(403);
        expect(db.snapshot()).toBe(before);
      });

      it("User A cannot take User B's pet by sending their own usuarioId (404, unchanged)", async () => {
        const before = db.snapshot();
        await http()
          .put(`/mascotas/${ids.petB}`)
          .set(as('userA'))
          .send({ usuarioId: ids.userA })
          .expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('a veterinarian cannot update unrelated pets', async () => {
        const before = db.snapshot();
        await http().put(`/mascotas/${ids.petA}`).set(as('vet')).send({ nombre: 'X' }).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('ADMIN transfers a pet; access to its records moves with it', async () => {
        await http()
          .put(`/mascotas/${ids.petA}`)
          .set(as('admin'))
          .send({ usuarioId: ids.userB })
          .expect(200);
        expect(db.get('mascotas', ids.petA)?.usuarioId).toBe(ids.userB);

        const cita = resources[0];
        await http().get(`${cita.url}/${cita.recA}`).set(as('userA')).expect(404);
        await http().get(`${cita.url}/${cita.recA}`).set(as('userB')).expect(200);
      });

      it('ADMIN transfer to a non-existent user returns 404 and changes nothing', async () => {
        const before = db.snapshot();
        await http()
          .put(`/mascotas/${ids.petA}`)
          .set(as('admin'))
          .send({ usuarioId: ids.missing, nombre: 'X' })
          .expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('an invalid UUID returns 400', async () => {
        await http().put('/mascotas/not-a-uuid').set(as('admin')).send({ nombre: 'X' }).expect(400);
      });
    });

    describe('DELETE', () => {
      it("User A cannot delete User B's pet (404, pet and records intact)", async () => {
        const before = db.snapshot();
        await http().delete(`/mascotas/${ids.petB}`).set(as('userA')).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it('a veterinarian cannot delete unrelated pets', async () => {
        const before = db.snapshot();
        await http().delete(`/mascotas/${ids.petA}`).set(as('vet')).expect(404);
        expect(db.snapshot()).toBe(before);
      });

      it("User A deletes their own pet; its records cascade, User B's remain", async () => {
        const res = await http().delete(`/mascotas/${ids.petA}`).set(as('userA')).expect(200);
        expect(res.body).toEqual({ message: 'Mascota eliminada con éxito' });
        expect(db.get('mascotas', ids.petA)).toBeUndefined();
        for (const r of resources) {
          expect(db.get(r.table, r.recA)).toBeUndefined();
          expect(db.get(r.table, r.recB)).toBeDefined();
        }
      });

      it("ADMIN can delete anyone's pet", async () => {
        await http().delete(`/mascotas/${ids.petB}`).set(as('admin')).expect(200);
        expect(db.get('mascotas', ids.petB)).toBeUndefined();
      });

      it('an invalid UUID returns 400', async () => {
        await http().delete('/mascotas/not-a-uuid').set(as('admin')).expect(400);
      });
    });
  });
});
