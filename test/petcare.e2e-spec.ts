import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createE2eApp, E2eContext, E2eRun } from './e2e/e2e-app.js';

/**
 * End-to-end tests: the real AppModule (JWT guards, role and ownership rules,
 * ValidationPipe, TypeORM) over HTTP against the dedicated PostgreSQL test
 * database. Every user is created through the public API with a unique
 * run-scoped email; only those users (and, by cascade, their pets and
 * records) are deleted afterwards. No admin account is used.
 */

const PASSWORD = 'E2e-Password-123';

interface TestUser {
  id: string;
  email: string;
  token: string;
}

const petBody = (nombre: string) => ({
  nombre,
  especie: 'PERRO',
  raza: 'Criollo',
  fecha_nacimiento: '2021-01-15',
  peso: 12.5,
});

/** The five pet-related modules: route, table, FK column and sample bodies. */
const RECORDS = [
  {
    name: 'Citas',
    url: '/citas',
    table: 'citas',
    fk: 'mascotaId',
    body: (petId: string) => ({
      mascotaId: petId,
      fechaHora: '2026-12-01T10:00:00.000Z',
      motivo: 'Control e2e',
      lugarveterinaria: 'Clínica e2e',
    }),
    update: { motivo: 'Motivo actualizado e2e' },
    messages: { created: 'Cita creada con éxito', updated: 'Cita actualizada con éxito', deleted: 'Cita eliminada con éxito' },
  },
  {
    name: 'Historias Clínicas',
    url: '/historias-clinicas',
    table: 'historias_clinicas',
    fk: 'mascotaId',
    body: (petId: string) => ({
      mascotaId: petId,
      fechaConsulta: '2026-11-01T09:00:00.000Z',
      diagnostico: 'Sano',
      pesoRegistrado: 10.5,
      veterinarioResponsable: 'Dra. E2E',
    }),
    update: { diagnostico: 'Diagnóstico actualizado e2e' },
    messages: {
      created: 'Historia clínica creada con éxito',
      updated: 'Historia clínica actualizada con éxito',
      deleted: 'Historia clínica eliminada con éxito',
    },
  },
  {
    name: 'Alimentación',
    url: '/alimentaciones',
    table: 'alimentaciones',
    fk: 'mascotaId',
    body: (petId: string) => ({
      mascotaId: petId,
      tipoAlimento: 'Concentrado',
      marca: 'Marca e2e',
      cantidad: 200,
      unidad: 'gramos',
      frecuencia: '2 veces al día',
      horario: '08:00 y 18:00',
    }),
    update: { marca: 'Marca actualizada e2e' },
    messages: {
      created: 'Alimentación creada con éxito',
      updated: 'Alimentación actualizada con éxito',
      deleted: 'Alimentación eliminada con éxito',
    },
  },
  {
    name: 'Vacunas',
    url: '/vacunas',
    table: 'vacunas',
    fk: 'mascota_id',
    body: (petId: string) => ({
      mascota_id: petId,
      nombreVacuna: 'Antirrábica',
      fechaAplicacion: '2026-01-10',
      loteVacuna: 'LOTE-E2E-1',
      proximaDosis: '2027-01-10',
    }),
    update: { loteVacuna: 'LOTE-E2E-2' },
    messages: { created: 'Vacuna registrada con éxito', updated: 'Vacuna actualizada con éxito', deleted: 'Vacuna eliminada con éxito' },
  },
  {
    name: 'Medicamentos',
    url: '/medicamentos',
    table: 'medicamentos',
    fk: 'mascotaId',
    body: (petId: string) => ({
      mascotaId: petId,
      nombreMedicamento: 'Amoxicilina',
      dosis: '1 tableta',
      frecuencia: 'Cada 12 horas',
      inicio: '2026-03-01',
      fin: '2026-03-10',
    }),
    update: { dosis: '2 tabletas' },
    messages: {
      created: 'Medicamento creado con éxito',
      updated: 'Medicamento actualizado con éxito',
      deleted: 'Medicamento eliminado con éxito',
    },
  },
] as const;

const CRUD_BASES = ['/usuarios', '/mascotas', ...RECORDS.map((r) => r.url)];

describe('PetCare API (e2e, PostgreSQL)', () => {
  let ctx: E2eContext;
  const run = new E2eRun();
  let userA: TestUser;
  let userB: TestUser;

  const http = () => request(ctx.app.getHttpServer());
  const auth = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

  /** Read-only verification queries against the test database. */
  const db = {
    row: async (table: string, id: string) =>
      ((await ctx.dataSource.query(`SELECT * FROM "${table}" WHERE id = $1`, [id])) as Record<
        string,
        unknown
      >[])[0],
    count: async (table: string, column: string, value: string) =>
      ((await ctx.dataSource.query(
        `SELECT count(*)::int AS n FROM "${table}" WHERE "${column}" = $1`,
        [value],
      )) as { n: number }[])[0].n,
  };

  async function register(label: string): Promise<{ id: string; email: string }> {
    const email = run.email(label);
    const res = await http()
      .post('/auth/register')
      .send({ nombre: `E2E ${label}`, email, password: PASSWORD, telefono: '3000000000' })
      .expect(201);
    return { id: res.body.data.id, email };
  }

  async function login(email: string): Promise<string> {
    const res = await http().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    return res.body.data.accessToken;
  }

  async function newUser(label: string): Promise<TestUser> {
    const { id, email } = await register(label);
    return { id, email, token: await login(email) };
  }

  async function createPet(owner: TestUser, nombre = 'Firulais E2E'): Promise<string> {
    const res = await http().post('/mascotas').set(auth(owner)).send(petBody(nombre)).expect(201);
    return res.body.data.id;
  }

  beforeAll(async () => {
    ctx = await createE2eApp();
    userA = await newUser('a');
    userB = await newUser('b');
  });

  afterAll(async () => {
    if (!ctx) return;
    try {
      await run.cleanup(ctx);
    } finally {
      await ctx.app.close();
    }
  });

  /* ---------------------------------------------------------------------- */

  describe('public endpoints', () => {
    it('GET / returns 200 with the health-check message', async () => {
      const res = await http().get('/').expect(200);
      expect(res.text).toBe('PetCare API funcionando!');
    });

    it('POST /auth/register creates a DUENO persisted with a bcrypt hash', async () => {
      const email = run.email('register');
      const res = await http()
        .post('/auth/register')
        .send({ nombre: 'Nuevo Dueño', email, password: PASSWORD, telefono: '3001112233' })
        .expect(201);

      expect(res.body.message).toBe('Usuario registrado con éxito');
      expect(res.body.data).toMatchObject({ email, rol: 'DUENO', estado: true });
      expect(res.body.data).not.toHaveProperty('password');

      const row = await db.row('usuarios', res.body.data.id);
      expect(row).toMatchObject({ email, rol: 'DUENO', estado: true });
      expect(String(row.password)).toMatch(/^\$2[aby]\$10\$/);
      expect(row.password).not.toBe(PASSWORD);
    });

    it('public registration cannot assign ADMIN (400, nothing stored)', async () => {
      const email = run.email('admin-attempt');
      await http()
        .post('/auth/register')
        .send({ nombre: 'Intruso', email, password: PASSWORD, telefono: '3001112233', rol: 'ADMIN' })
        .expect(400);
      expect(await db.count('usuarios', 'email', email)).toBe(0);
    });

    it('a duplicate email returns 409', async () => {
      await http()
        .post('/auth/register')
        .send({ nombre: 'Duplicado', email: userA.email, password: PASSWORD, telefono: '3001112233' })
        .expect(409);
      expect(await db.count('usuarios', 'email', userA.email)).toBe(1);
    });

    it('POST /auth/login returns a valid JWT for the user', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: userA.email, password: PASSWORD })
        .expect(200);

      expect(res.body.data.tokenType).toBe('Bearer');
      expect(res.body.data.usuario).toMatchObject({ id: userA.id, email: userA.email });
      expect(res.body.data.usuario).not.toHaveProperty('password');

      const token: string = res.body.data.accessToken;
      expect(token.split('.')).toHaveLength(3);
      const payload = new JwtService().decode(token) as { sub: string; rol: string; exp: number; iat: number };
      expect(payload).toMatchObject({ sub: userA.id, rol: 'DUENO' });
      expect(payload.exp - payload.iat).toBe(3600);
    });

    it.each([
      ['a wrong password', () => ({ email: userA.email, password: 'Otra-Clave-999' })],
      ['an unknown email', () => ({ email: run.email('unknown'), password: PASSWORD })],
    ])('invalid credentials (%s) return 401', async (_label, body) => {
      const res = await http().post('/auth/login').send(body()).expect(401);
      expect(res.body.message).toBe('Credenciales inválidas');
    });
  });

  /* ---------------------------------------------------------------------- */

  describe('authentication', () => {
    it('GET /auth/me returns 401 without a token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('GET /auth/me returns 401 for a malformed or forged token', async () => {
      await http().get('/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
      const forged = new JwtService({ secret: 'another-secret-that-is-long-enough-123456' }).sign({
        sub: userA.id,
        rol: 'ADMIN',
      });
      await http().get('/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });

    it('GET /auth/me returns 401 for an expired token signed with the real secret', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expired = new JwtService({ secret: ctx.config.jwtSecret }).sign({
        sub: userA.id,
        email: userA.email,
        rol: 'DUENO',
        iat: now - 7200,
        exp: now - 3600,
      });
      await http().get('/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('GET /auth/me returns the authenticated user', async () => {
      const res = await http().get('/auth/me').set(auth(userA)).expect(200);
      expect(res.body.message).toBe('Perfil del usuario autenticado');
      expect(res.body.data).toMatchObject({ id: userA.id, email: userA.email, rol: 'DUENO' });
      expect(res.body.data).not.toHaveProperty('password');
    });

    it.each(CRUD_BASES)('%s rejects anonymous list and create requests with 401', async (base) => {
      await http().get(base).expect(401);
      await http().post(base).send({}).expect(401);
      await http().get(`${base}/00000000-0000-4000-8000-000000000000`).expect(401);
    });
  });

  /* ---------------------------------------------------------------------- */

  describe('ownership between two independent users', () => {
    it("User A sees their pet; User B neither lists it nor gets it by id (404)", async () => {
      const petId = await createPet(userA, 'Privada de A');

      const listA = await http().get('/mascotas').set(auth(userA)).expect(200);
      expect(listA.body.map((m: { id: string }) => m.id)).toContain(petId);
      await http().get(`/mascotas/${petId}`).set(auth(userA)).expect(200);

      const listB = await http().get('/mascotas').set(auth(userB)).expect(200);
      expect(listB.body.map((m: { id: string }) => m.id)).not.toContain(petId);
      expect(listB.body.every((m: { usuarioId: string }) => m.usuarioId === userB.id)).toBe(true);

      const res = await http().get(`/mascotas/${petId}`).set(auth(userB)).expect(404);
      expect(res.body.message).toBe(`Mascota con ID ${petId} no encontrada`);
    });

    it("User B cannot modify or delete User A's pet, and the row is unchanged", async () => {
      const petId = await createPet(userA, 'Intocable');
      const before = await db.row('mascotas', petId);

      await http().put(`/mascotas/${petId}`).set(auth(userB)).send({ nombre: 'Hackeada' }).expect(404);
      await http()
        .put(`/mascotas/${petId}`)
        .set(auth(userB))
        .send({ usuarioId: userB.id })
        .expect(404);
      await http().delete(`/mascotas/${petId}`).set(auth(userB)).expect(404);

      expect(await db.row('mascotas', petId)).toEqual(before);
    });

    it("User A cannot transfer their pet to User B (403, unchanged)", async () => {
      const petId = await createPet(userA, 'No transferible');
      const before = await db.row('mascotas', petId);

      await http().put(`/mascotas/${petId}`).set(auth(userA)).send({ usuarioId: userB.id }).expect(403);

      expect(await db.row('mascotas', petId)).toEqual(before);
    });

    it('User B cannot register a pet on behalf of User A (403, nothing stored)', async () => {
      const nombre = `Ajena-${run.runId}`;
      await http()
        .post('/mascotas')
        .set(auth(userB))
        .send({ ...petBody(nombre), usuarioId: userA.id })
        .expect(403);
      expect(await db.count('mascotas', 'nombre', nombre)).toBe(0);
    });

    it.each(RECORDS)("User B cannot create $name for User A's pet (404, nothing stored)", async (r) => {
      const petId = await createPet(userA, `Para ${r.name}`);

      const res = await http().post(r.url).set(auth(userB)).send(r.body(petId)).expect(404);
      expect(res.body.message).toBe(`Mascota con ID ${petId} no encontrada`);
      expect(await db.count(r.table, r.fk, petId)).toBe(0);
    });

    it.each(RECORDS)("User B cannot read, update or delete User A's $name (404, unchanged)", async (r) => {
      const petId = await createPet(userA, `Con ${r.name}`);
      const created = await http().post(r.url).set(auth(userA)).send(r.body(petId)).expect(201);
      const recordId: string = created.body.data.id;
      const before = await db.row(r.table, recordId);

      const listB = await http().get(r.url).set(auth(userB)).expect(200);
      expect(listB.body.map((x: { id: string }) => x.id)).not.toContain(recordId);
      await http().get(`${r.url}/${recordId}`).set(auth(userB)).expect(404);
      await http().put(`${r.url}/${recordId}`).set(auth(userB)).send(r.update).expect(404);
      await http().delete(`${r.url}/${recordId}`).set(auth(userB)).expect(404);

      expect(await db.row(r.table, recordId)).toEqual(before);
    });
  });

  /* ---------------------------------------------------------------------- */

  describe('CRUD with real persistence', () => {
    it('Mascotas: create, read, update and delete', async () => {
      const created = await http().post('/mascotas').set(auth(userA)).send(petBody('Ciclo CRUD')).expect(201);
      expect(created.body.message).toBe('Mascota creada con éxito');
      const petId: string = created.body.data.id;
      // Owner assigned server-side from the JWT, sanitized in the response.
      expect(created.body.data.usuarioId).toBe(userA.id);
      expect(created.body.data.usuario).not.toHaveProperty('password');
      expect(await db.row('mascotas', petId)).toMatchObject({ usuarioId: userA.id, nombre: 'Ciclo CRUD', peso: 12.5 });

      const read = await http().get(`/mascotas/${petId}`).set(auth(userA)).expect(200);
      expect(read.body).toMatchObject({ message: 'Mascota encontrada', data: { id: petId, nombre: 'Ciclo CRUD' } });

      const updated = await http().put(`/mascotas/${petId}`).set(auth(userA)).send({ peso: 14.25 }).expect(200);
      expect(updated.body.message).toBe('Mascota actualizada con éxito');
      expect(await db.row('mascotas', petId)).toMatchObject({ peso: 14.25, nombre: 'Ciclo CRUD' });

      const deleted = await http().delete(`/mascotas/${petId}`).set(auth(userA)).expect(200);
      expect(deleted.body).toEqual({ message: 'Mascota eliminada con éxito' });
      expect(await db.row('mascotas', petId)).toBeUndefined();
    });

    it.each(RECORDS)('$name: create, read, list, update and delete', async (r) => {
      const petId = await createPet(userA, `CRUD ${r.name}`);

      const created = await http().post(r.url).set(auth(userA)).send(r.body(petId)).expect(201);
      expect(created.body.message).toBe(r.messages.created);
      const recordId: string = created.body.data.id;
      expect(await db.row(r.table, recordId)).toMatchObject({ [r.fk]: petId });

      const read = await http().get(`${r.url}/${recordId}`).set(auth(userA)).expect(200);
      expect(read.body.data).toMatchObject({ id: recordId, [r.fk]: petId });

      const list = await http().get(r.url).set(auth(userA)).expect(200);
      expect(list.body.map((x: { id: string }) => x.id)).toContain(recordId);

      const updated = await http().put(`${r.url}/${recordId}`).set(auth(userA)).send(r.update).expect(200);
      expect(updated.body.message).toBe(r.messages.updated);
      expect(await db.row(r.table, recordId)).toMatchObject(r.update);

      const deleted = await http().delete(`${r.url}/${recordId}`).set(auth(userA)).expect(200);
      expect(deleted.body).toEqual({ message: r.messages.deleted });
      expect(await db.row(r.table, recordId)).toBeUndefined();
    });

    it("deleting a pet cascades to its records only (another user's data is intact)", async () => {
      const petA = await createPet(userA, 'Cascada A');
      const petB = await createPet(userB, 'Cascada B');
      const recordsA: string[] = [];
      const recordsB: string[] = [];
      for (const r of RECORDS) {
        recordsA.push((await http().post(r.url).set(auth(userA)).send(r.body(petA)).expect(201)).body.data.id);
        recordsB.push((await http().post(r.url).set(auth(userB)).send(r.body(petB)).expect(201)).body.data.id);
      }

      await http().delete(`/mascotas/${petA}`).set(auth(userA)).expect(200);

      expect(await db.row('mascotas', petA)).toBeUndefined();
      expect(await db.row('mascotas', petB)).toBeDefined();
      for (const [i, r] of RECORDS.entries()) {
        expect(await db.row(r.table, recordsA[i]), `${r.table} of A`).toBeUndefined();
        expect(await db.row(r.table, recordsB[i]), `${r.table} of B`).toBeDefined();
      }
    });
  });

  /* ---------------------------------------------------------------------- */

  describe('validation and sensitive data', () => {
    it.each(['/mascotas', ...RECORDS.map((r) => r.url)])('%s/:id with an invalid UUID returns 400', async (base) => {
      const res = await http().get(`${base}/not-a-uuid`).set(auth(userA)).expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        message: 'Validation failed (uuid is expected)',
        error: 'Bad Request',
      });
    });

    it('an invalid pet body returns 400 with validation messages and stores nothing', async () => {
      const nombre = `Invalida-${run.runId}`;
      const res = await http()
        .post('/mascotas')
        .set(auth(userA))
        .send({ ...petBody(nombre), especie: 'DRAGON', peso: -3 })
        .expect(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(await db.count('mascotas', 'nombre', nombre)).toBe(0);
    });

    it.each(RECORDS)('$name: invalid body and unknown fields return 400', async (r) => {
      const petId = await createPet(userA, `Validación ${r.name}`);
      await http().post(r.url).set(auth(userA)).send({ [r.fk]: 'not-a-uuid' }).expect(400);
      await http()
        .post(r.url)
        .set(auth(userA))
        .send({ ...r.body(petId), usuarioId: userB.id })
        .expect(400);
      expect(await db.count(r.table, r.fk, petId)).toBe(0);
    });

    it('responses never expose password hashes', async () => {
      await createPet(userA, 'Con dueño');
      const responses = [
        await http().get('/auth/me').set(auth(userA)).expect(200),
        await http().post('/auth/login').send({ email: userA.email, password: PASSWORD }).expect(200),
        await http().get('/mascotas').set(auth(userA)).expect(200),
        await http().get(`/usuarios/${userA.id}`).set(auth(userA)).expect(200),
      ];
      for (const res of responses) {
        expect(res.text).not.toContain('"password"');
        expect(res.text).not.toMatch(/\$2[aby]\$\d{2}\$/);
      }
    });
  });

  /* ---------------------------------------------------------------------- */

  describe('Swagger', () => {
    it('GET /api/docs-json serves the OpenAPI document in the e2e environment', async () => {
      const res = await http().get('/api/docs-json').expect(200);
      expect(res.body.info.title).toBe('PetCare API');
      expect(Object.keys(res.body.paths)).toHaveLength(18);
      expect(res.body.components.securitySchemes.jwt).toMatchObject({ type: 'http', scheme: 'bearer' });
    });
  });
});
