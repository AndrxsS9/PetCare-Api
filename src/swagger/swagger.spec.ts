import {
  ExecutionContext,
  HttpException,
  INestApplication,
  ParseUUIDPipe,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { AuthController } from '../auth/auth.controller.js';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from '../auth/auth.service.js';
import { RegisterDto } from '../auth/auth.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { UsuariosController } from '../usuarios/usuarios.controller.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { MascotasController } from '../mascotas/mascotas.controller.js';
import { MascotasService } from '../mascotas/mascotas.service.js';
import { CitasController } from '../citas/citas.controller.js';
import { CitasService } from '../citas/citas.service.js';
import { HistoriasClinicasController } from '../historias-clinicas/historias-clinicas.controller.js';
import { HistoriasClinicasService } from '../historias-clinicas/historias-clinicas.service.js';
import { AlimentacionController } from '../alimentacion/alimentacion.controller.js';
import { AlimentacionesService } from '../alimentacion/alimentaciones.service.js';
import { VacunasController } from '../vacunas/vacunas.controller.js';
import { VacunasService } from '../vacunas/vacunas.service.js';
import { MedicamentosController } from '../medicamentos/medicamentos.controller.js';
import { MedicamentosService } from '../medicamentos/medicamentos.service.js';
import {
  API_TAGS,
  BEARER_SCHEME,
  createSwaggerDocument,
  isSwaggerEnabled,
  setupSwagger,
  SWAGGER_JSON_PATH,
  SWAGGER_PATH,
} from './swagger.config.js';
import { EXAMPLE_ID, HTTP_ERROR_NAMES } from './api-docs.decorators.js';

/**
 * Builds the OpenAPI document from the real controllers and DTOs. Services are
 * replaced by empty objects: generating the document never touches them, so
 * no PostgreSQL connection is needed.
 */
const CONTROLLERS: Type<unknown>[] = [
  AppController,
  AuthController,
  UsuariosController,
  MascotasController,
  CitasController,
  HistoriasClinicasController,
  AlimentacionController,
  VacunasController,
  MedicamentosController,
];
const SERVICES = [
  AppService,
  AuthService,
  UsuariosService,
  MascotasService,
  CitasService,
  HistoriasClinicasService,
  AlimentacionesService,
  VacunasService,
  MedicamentosService,
];

async function createApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: CONTROLLERS,
    providers: SERVICES.map((provide) => ({ provide, useValue: {} })),
  }).compile();
  return module.createNestApplication();
}

type Method = 'get' | 'post' | 'put' | 'delete';
type Operation = {
  operationId: string;
  tags?: string[];
  security?: Record<string, string[]>[];
  parameters?: { name: string; in: string; required?: boolean; schema: Record<string, unknown> }[];
  requestBody?: { required?: boolean; content: Record<string, { schema: Record<string, unknown> }> };
  responses: Record<string, { description: string; content?: Record<string, { schema: Record<string, unknown> }> }>;
};

const CRUD_MODULES = [
  { base: '/mascotas', tag: API_TAGS.mascotas },
  { base: '/citas', tag: API_TAGS.citas },
  { base: '/historias-clinicas', tag: API_TAGS.historias },
  { base: '/alimentaciones', tag: API_TAGS.alimentacion },
  { base: '/vacunas', tag: API_TAGS.vacunas },
  { base: '/medicamentos', tag: API_TAGS.medicamentos },
];
const PET_RECORD_MODULES = CRUD_MODULES.slice(1);

describe('OpenAPI document', () => {
  let app: INestApplication;
  let doc: OpenAPIObject;

  const op = (path: string, method: Method) => {
    const operation = doc.paths[path]?.[method] as Operation | undefined;
    if (!operation) throw new Error(`Missing operation ${method.toUpperCase()} ${path}`);
    return operation;
  };
  const allOps = () =>
    Object.entries(doc.paths).flatMap(([path, item]) =>
      (['get', 'post', 'put', 'delete'] as Method[])
        .filter((m) => item[m])
        .map((m) => ({ path, method: m, operation: item[m] as Operation })),
    );
  const schema = (name: string) => {
    const s = doc.components?.schemas?.[name] as
      | { properties: Record<string, Record<string, unknown>>; required?: string[] }
      | undefined;
    if (!s) throw new Error(`Missing schema ${name}`);
    return s;
  };
  const refName = (s: Record<string, unknown> | undefined) =>
    String((s as { $ref?: string } | undefined)?.$ref ?? '').replace('#/components/schemas/', '');

  /** Collects every property name reachable from a schema, following $ref. */
  const reachableProps = (s: unknown, seen = new Set<string>()): string[] => {
    if (!s || typeof s !== 'object') return [];
    const node = s as Record<string, unknown>;
    const out: string[] = [];
    if (typeof node.$ref === 'string') {
      const name = refName(node);
      if (seen.has(name)) return [];
      seen.add(name);
      return reachableProps(doc.components?.schemas?.[name], seen);
    }
    if (node.properties && typeof node.properties === 'object') {
      for (const [key, value] of Object.entries(node.properties)) {
        out.push(key, ...reachableProps(value, seen));
      }
    }
    for (const key of ['items', 'allOf', 'oneOf', 'anyOf']) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => out.push(...reachableProps(c, seen)));
      else if (child) out.push(...reachableProps(child, seen));
    }
    return out;
  };

  beforeAll(async () => {
    app = await createApp();
    doc = createSwaggerDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('general information', () => {
    it('has the PetCare title, a version and a Spanish description', () => {
      expect(doc.info.title).toBe('PetCare API');
      expect(doc.info.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(doc.info.description).toContain('Autenticación');
      expect(doc.info.description).toContain('Authorize');
      expect(doc.info.description).toMatch(/mascotas ajenas se responden con \*\*404\*\*/);
    });

    it('declares the nine tags in order', () => {
      expect(doc.tags?.map((t) => t.name)).toEqual(Object.values(API_TAGS));
    });
  });

  describe('paths and methods', () => {
    const expected: Record<string, Method[]> = {
      '/': ['get'],
      '/auth/register': ['post'],
      '/auth/login': ['post'],
      '/auth/me': ['get'],
      '/usuarios': ['get', 'post'],
      '/usuarios/{id}': ['get', 'put', 'delete'],
      ...Object.fromEntries(
        CRUD_MODULES.flatMap(({ base }) => [
          [base, ['get', 'post']],
          [`${base}/{id}`, ['get', 'put', 'delete']],
        ]),
      ),
    };

    it('documents exactly the existing routes (no invented endpoints)', () => {
      expect(Object.keys(doc.paths).sort()).toEqual(Object.keys(expected).sort());
    });

    it.each(Object.entries(expected))('%s exposes exactly %j', (path, methods) => {
      const documented = Object.keys(doc.paths[path]).filter((k) =>
        ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(k),
      );
      expect(documented.sort()).toEqual([...methods].sort());
    });

    it('every operation has a summary and exactly one tag', () => {
      for (const { operation } of allOps()) {
        expect((operation as { summary?: string }).summary).toBeTruthy();
        expect(operation.tags).toHaveLength(1);
      }
    });

    it.each([
      ['/', API_TAGS.estado],
      ['/auth/login', API_TAGS.auth],
      ['/auth/me', API_TAGS.auth],
      ['/usuarios/{id}', API_TAGS.usuarios],
      ...CRUD_MODULES.map(({ base, tag }) => [`${base}/{id}`, tag]),
    ])('%s is grouped under "%s"', (path, tag) => {
      for (const operation of Object.values(doc.paths[path])) {
        expect((operation as Operation).tags).toEqual([tag]);
      }
    });
  });

  describe('Bearer JWT security', () => {
    it(`defines the "${BEARER_SCHEME}" HTTP bearer scheme`, () => {
      expect(doc.components?.securitySchemes?.[BEARER_SCHEME]).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });

    it.each([
      ['/', 'get'],
      ['/auth/register', 'post'],
      ['/auth/login', 'post'],
    ] as const)('%s %s is public (no security requirement)', (path, method) => {
      const operation = op(path, method);
      expect(operation.security ?? []).toEqual([]);
      expect(operation.responses['401']?.description ?? '').not.toMatch(/Token JWT/);
    });

    it('every other operation requires the jwt scheme and documents 401', () => {
      const publicOps = new Set(['GET /', 'POST /auth/register', 'POST /auth/login']);
      const protectedOps = allOps().filter(
        ({ path, method }) => !publicOps.has(`${method.toUpperCase()} ${path}`),
      );
      // GET /auth/me + 5 Usuarios operations + 5 operations in each of the 6 CRUD modules.
      expect(protectedOps).toHaveLength(1 + 5 + 6 * 5);
      for (const { operation } of protectedOps) {
        expect(operation.security).toEqual([{ [BEARER_SCHEME]: [] }]);
        expect(operation.responses['401']).toBeDefined();
      }
    });

    it('documented security matches the runtime @Public() metadata of every handler', () => {
      const handlers = new Map<string, { isPublic: boolean; roles?: string[] }>();
      for (const controller of CONTROLLERS) {
        for (const name of Object.getOwnPropertyNames(controller.prototype)) {
          if (name === 'constructor') continue;
          const handler = controller.prototype[name];
          handlers.set(`${controller.name}_${name}`, {
            isPublic: Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true,
            roles: Reflect.getMetadata(ROLES_KEY, handler),
          });
        }
      }

      for (const { operation } of allOps()) {
        const runtime = handlers.get(operation.operationId);
        expect(runtime, operation.operationId).toBeDefined();
        const documentedPublic = (operation.security ?? []).length === 0;
        expect(documentedPublic, operation.operationId).toBe(runtime!.isPublic);
        // Every role-restricted route documents its 403.
        if (runtime!.roles?.length) {
          expect(operation.responses['403'], operation.operationId).toBeDefined();
        }
      }
    });
  });

  describe('DTO documentation', () => {
    it('RegisterDto: four required fields and no rol/estado', () => {
      const s = schema('RegisterDto');
      expect(s.required?.sort()).toEqual(['email', 'nombre', 'password', 'telefono']);
      expect(Object.keys(s.properties)).not.toContain('rol');
      expect(Object.keys(s.properties)).not.toContain('estado');
      expect(s.properties.password).toMatchObject({ minLength: 6, maxLength: 72, format: 'password' });
      expect(s.properties.email).toMatchObject({ format: 'email', maxLength: 150 });
      expect(s.properties.nombre).toMatchObject({ maxLength: 100 });
      expect(s.properties.telefono).toMatchObject({ maxLength: 20 });
    });

    it('LoginDto: email and password are required', () => {
      const s = schema('LoginDto');
      expect(s.required?.sort()).toEqual(['email', 'password']);
      expect(s.properties.password).toMatchObject({ maxLength: 128 });
    });

    it('CreateUsuarioDto: rol is required and estado optional', () => {
      const s = schema('CreateUsuarioDto');
      expect(s.required?.sort()).toEqual(['email', 'nombre', 'password', 'rol', 'telefono']);
      expect(s.properties.estado).toMatchObject({ type: 'boolean' });
    });

    it('CreateMascotaDto: usuarioId is an optional UUID; the rest of the pet is required', () => {
      const s = schema('CreateMascotaDto');
      expect(s.required?.sort()).toEqual(['especie', 'fecha_nacimiento', 'nombre', 'peso', 'raza']);
      expect(s.properties.usuarioId).toMatchObject({ type: 'string', format: 'uuid' });
      expect(String(s.properties.usuarioId.description)).toMatch(/se omite.*usuario autenticado/);
      expect(s.properties.fecha_nacimiento).toMatchObject({ type: 'string', format: 'date' });
      expect(s.properties.peso).toMatchObject({ type: 'number' });
      expect(s.properties.estado).toMatchObject({ type: 'boolean' });
    });

    it.each([
      'UpdateUsuarioDto',
      'UpdateMascotaDto',
      'UpdateCitaDto',
      'UpdateHistoriaClinicaDto',
      'UpdateAlimentacionDto',
      'UpdateVacunaDto',
      'UpdateMedicamentoDto',
    ])('%s: every field is optional (partial update)', (name) => {
      const s = schema(name);
      expect(s.required ?? []).toEqual([]);
      expect(Object.keys(s.properties).length).toBeGreaterThan(0);
    });

    it.each([
      ['CreateCitaDto', ['fechaHora', 'lugarveterinaria', 'mascotaId', 'motivo']],
      [
        'CreateHistoriaClinicaDto',
        ['diagnostico', 'fechaConsulta', 'mascotaId', 'pesoRegistrado', 'veterinarioResponsable'],
      ],
      [
        'CreateAlimentacionDto',
        ['cantidad', 'frecuencia', 'horario', 'marca', 'mascotaId', 'tipoAlimento', 'unidad'],
      ],
      ['CreateVacunaDto', ['fechaAplicacion', 'loteVacuna', 'mascota_id', 'nombreVacuna', 'proximaDosis']],
      [
        'CreateMedicamentoDto',
        ['dosis', 'fin', 'frecuencia', 'inicio', 'mascotaId', 'nombreMedicamento'],
      ],
    ])('%s: required fields', (name, required) => {
      expect(schema(name).required?.sort()).toEqual(required);
    });

    it.each([
      ['CreateCitaDto', ['estado']],
      ['CreateHistoriaClinicaDto', ['observaciones']],
      ['CreateAlimentacionDto', ['observaciones']],
      ['CreateVacunaDto', ['observaciones']],
      ['CreateMedicamentoDto', ['estado', 'observaciones']],
    ])('%s: optional fields are documented but not required', (name, optional) => {
      const s = schema(name);
      for (const field of optional) {
        expect(s.properties[field]).toBeDefined();
        expect(s.required).not.toContain(field);
      }
    });

    it('Vacunas uses mascota_id; every other pet-related module uses mascotaId', () => {
      const vacuna = schema('CreateVacunaDto');
      expect(vacuna.properties.mascota_id).toMatchObject({ type: 'string', format: 'uuid' });
      expect(vacuna.properties.mascotaId).toBeUndefined();
      expect(schema('VacunaDto').properties.mascota_id).toBeDefined();
      expect(schema('VacunaDto').properties.mascotaId).toBeUndefined();

      for (const name of ['Cita', 'HistoriaClinica', 'Alimentacion', 'Medicamento']) {
        for (const s of [schema(`Create${name}Dto`), schema(`${name}Dto`)]) {
          expect(s.properties.mascotaId).toMatchObject({ type: 'string', format: 'uuid' });
          expect(s.properties.mascota_id).toBeUndefined();
        }
      }
    });

    it('update DTOs of pet records do not expose the pet reference', () => {
      for (const name of ['Cita', 'HistoriaClinica', 'Alimentacion', 'Vacuna', 'Medicamento']) {
        const props = Object.keys(schema(`Update${name}Dto`).properties);
        expect(props).not.toContain('mascotaId');
        expect(props).not.toContain('mascota_id');
      }
    });

    it('documents string length limits from the validators', () => {
      expect(schema('CreateCitaDto').properties.motivo).toMatchObject({ maxLength: 255 });
      expect(schema('CreateHistoriaClinicaDto').properties.veterinarioResponsable).toMatchObject({
        maxLength: 150,
      });
      expect(schema('CreateAlimentacionDto').properties.unidad).toMatchObject({ maxLength: 50 });
      expect(schema('CreateVacunaDto').properties.nombreVacuna).toMatchObject({ maxLength: 150 });
      expect(schema('CreateMedicamentoDto').properties.dosis).toMatchObject({ maxLength: 100 });
    });

    it('documents date and date-time formats', () => {
      expect(schema('CreateCitaDto').properties.fechaHora).toMatchObject({ format: 'date-time' });
      expect(schema('CreateHistoriaClinicaDto').properties.fechaConsulta).toMatchObject({
        format: 'date-time',
      });
      for (const field of ['fechaAplicacion', 'proximaDosis']) {
        expect(schema('CreateVacunaDto').properties[field]).toMatchObject({ type: 'string', format: 'date' });
      }
      for (const field of ['inicio', 'fin']) {
        expect(schema('CreateMedicamentoDto').properties[field]).toMatchObject({
          type: 'string',
          format: 'date',
        });
      }
    });

    it.each([
      ['RolUsuario', ['DUENO', 'VETERINARIO', 'ADMIN']],
      ['EspecieMascota', ['PERRO', 'GATO', 'AVE', 'OTRO']],
      ['EstadoCita', ['PROGRAMADA', 'REALIZADA', 'CANCELADA', 'REPROGRAMADA']],
    ])('enum %s lists its real values', (name, values) => {
      expect(doc.components?.schemas?.[name]).toEqual({ type: 'string', enum: values });
    });

    it.each([
      ['CreateUsuarioDto', 'rol', 'RolUsuario'],
      ['UpdateUsuarioDto', 'rol', 'RolUsuario'],
      ['CreateMascotaDto', 'especie', 'EspecieMascota'],
      ['CreateCitaDto', 'estado', 'EstadoCita'],
      ['UpdateCitaDto', 'estado', 'EstadoCita'],
    ])('%s.%s references the %s enum', (dto, field, enumName) => {
      const property = schema(dto).properties[field] as { allOf?: { $ref: string }[]; $ref?: string };
      const ref = property.$ref ?? property.allOf?.[0]?.$ref;
      expect(ref).toBe(`#/components/schemas/${enumName}`);
    });
  });

  describe('HTTP responses', () => {
    const codes = (path: string, method: Method) => Object.keys(op(path, method).responses).sort();

    it('auth endpoints document their real status codes', () => {
      expect(codes('/', 'get')).toEqual(['200']);
      expect(codes('/auth/register', 'post')).toEqual(['201', '400', '409']);
      expect(codes('/auth/login', 'post')).toEqual(['200', '400', '401']);
      expect(codes('/auth/me', 'get')).toEqual(['200', '401']);
    });

    it('usuarios documents role-based 403 and duplicate-email 409', () => {
      expect(codes('/usuarios', 'get')).toEqual(['200', '401', '403']);
      expect(codes('/usuarios', 'post')).toEqual(['201', '400', '401', '403', '409']);
      expect(codes('/usuarios/{id}', 'get')).toEqual(['200', '401', '403', '404']);
      expect(codes('/usuarios/{id}', 'put')).toEqual(['200', '400', '401', '403', '404', '409']);
      expect(codes('/usuarios/{id}', 'delete')).toEqual(['200', '401', '403', '404']);
    });

    it('mascotas documents 403 only where a non-admin can be forbidden', () => {
      expect(codes('/mascotas', 'get')).toEqual(['200', '401']);
      expect(codes('/mascotas', 'post')).toEqual(['201', '400', '401', '403', '404']);
      expect(codes('/mascotas/{id}', 'get')).toEqual(['200', '400', '401', '404']);
      expect(codes('/mascotas/{id}', 'put')).toEqual(['200', '400', '401', '403', '404']);
      expect(codes('/mascotas/{id}', 'delete')).toEqual(['200', '400', '401', '404']);
    });

    it.each(PET_RECORD_MODULES)('$base: foreign records are 404 (never 403)', ({ base }) => {
      expect(codes(base, 'get')).toEqual(['200', '401']);
      expect(codes(base, 'post')).toEqual(['201', '400', '401', '404']);
      expect(codes(`${base}/{id}`, 'get')).toEqual(['200', '400', '401', '404']);
      expect(codes(`${base}/{id}`, 'put')).toEqual(['200', '400', '401', '404']);
      expect(codes(`${base}/{id}`, 'delete')).toEqual(['200', '400', '401', '404']);
      expect(op(`${base}/{id}`, 'get').responses['404'].description).toMatch(/ajena/);
    });

    it.each(CRUD_MODULES)('$base/{id} declares id as a required UUID path parameter', ({ base }) => {
      for (const method of ['get', 'put', 'delete'] as Method[]) {
        const id = op(`${base}/{id}`, method).parameters?.find((p) => p.name === 'id');
        expect(id).toMatchObject({ in: 'path', required: true, schema: { type: 'string', format: 'uuid' } });
      }
    });

    it.each([
      ['/auth/register', 'RegisterDto'],
      ['/auth/login', 'LoginDto'],
      ['/usuarios', 'CreateUsuarioDto'],
      ['/mascotas', 'CreateMascotaDto'],
      ['/citas', 'CreateCitaDto'],
      ['/historias-clinicas', 'CreateHistoriaClinicaDto'],
      ['/alimentaciones', 'CreateAlimentacionDto'],
      ['/vacunas', 'CreateVacunaDto'],
      ['/medicamentos', 'CreateMedicamentoDto'],
    ])('POST %s takes %s as its body', (path, dto) => {
      const body = op(path, 'post').requestBody!;
      expect(body.required).toBe(true);
      expect(refName(body.content['application/json'].schema)).toBe(dto);
    });

    it('single-record responses use the { message, data } envelope with the real messages', () => {
      const ok = op('/vacunas', 'post').responses['201'].content!['application/json'].schema as {
        required: string[];
        properties: { message: { example: string }; data: Record<string, unknown> };
      };
      expect(ok.required).toEqual(['message', 'data']);
      expect(ok.properties.message.example).toBe('Vacuna registrada con éxito');
      expect(refName(ok.properties.data)).toBe('VacunaDto');

      const login = op('/auth/login', 'post').responses['200'].content!['application/json']
        .schema as { properties: { message: { example: string }; data: Record<string, unknown> } };
      expect(login.properties.message.example).toBe('Inicio de sesión exitoso');
      expect(refName(login.properties.data)).toBe('LoginDataDto');
    });

    it('collections are documented as arrays of the record schema', () => {
      const list = op('/citas', 'get').responses['200'].content!['application/json'].schema as {
        type: string;
        items: Record<string, unknown>;
      };
      expect(list.type).toBe('array');
      expect(refName(list.items)).toBe('CitaDto');
    });

    it('GET / is documented as plain text', () => {
      expect(Object.keys(op('/', 'get').responses['200'].content ?? {})).toEqual(['text/plain']);
    });
  });

  describe('error response examples', () => {
    type ErrorExample = { statusCode: number; message: string | string[]; error: string };
    type Media = { example?: ErrorExample; examples?: Record<string, { value: ErrorExample }> };

    /** Every documented example body of one response. */
    const examplesOf = (path: string, method: Method, status: string): ErrorExample[] => {
      const media = op(path, method).responses[status]?.content?.['application/json'] as
        | Media
        | undefined;
      if (!media) return [];
      return [
        ...(media.example ? [media.example] : []),
        ...Object.values(media.examples ?? {}).map((e) => e.value),
      ];
    };
    const errorResponses = () =>
      allOps().flatMap(({ path, method, operation }) =>
        Object.keys(operation.responses)
          .filter((status) => Number(status) >= 400)
          .map((status) => ({ path, method, status })),
      );
    const messageOf = (path: string, method: Method, status: string) =>
      examplesOf(path, method, status).map((e) => e.message);
    /** Body NestJS sends for a thrown HttpException. */
    const bodyOf = (error: unknown) => (error as HttpException).getResponse();
    const textOf = (message: string | string[]) => ([] as string[]).concat(message).join(' ');

    it('the shared ErrorResponseDto schema carries no hardcoded example values', () => {
      for (const property of Object.values(schema('ErrorResponseDto').properties)) {
        expect(property).not.toHaveProperty('example');
      }
    });

    it('documents 400, 401, 403, 404 and 409 responses', () => {
      const statuses = new Set(errorResponses().map((r) => r.status));
      expect([...statuses].sort()).toEqual(['400', '401', '403', '404', '409']);
    });

    it('every error response has an example whose statusCode and error match its status', () => {
      const responses = errorResponses();
      expect(responses.length).toBeGreaterThan(100);
      for (const { path, method, status } of responses) {
        const examples = examplesOf(path, method, status);
        const where = `${method.toUpperCase()} ${path} ${status}`;
        expect(examples.length, where).toBeGreaterThan(0);
        for (const example of examples) {
          expect(example.statusCode, where).toBe(Number(status));
          expect(example.error, where).toBe(
            HTTP_ERROR_NAMES[Number(status) as keyof typeof HTTP_ERROR_NAMES],
          );
          expect(example.message.length, where).toBeGreaterThan(0);
        }
      }
    });

    it('only 404 examples talk about missing records', () => {
      for (const { path, method, status } of errorResponses()) {
        for (const message of messageOf(path, method, status)) {
          const where = `${method.toUpperCase()} ${path} ${status}`;
          if (status === '404') {
            expect(textOf(message), where).toMatch(/no encontrad[ao]|no existe/);
          } else {
            expect(textOf(message), where).not.toMatch(/no encontrad[ao]|no existe/);
          }
        }
      }
    });

    it.each([
      ['/usuarios/{id}', `Usuario con ID ${EXAMPLE_ID} no encontrado`],
      ['/mascotas/{id}', `Mascota con ID ${EXAMPLE_ID} no encontrada`],
      ['/citas/{id}', `Cita con ID ${EXAMPLE_ID} no encontrada`],
      ['/historias-clinicas/{id}', `Historia clínica con ID ${EXAMPLE_ID} no encontrada`],
      ['/alimentaciones/{id}', `Alimentación con ID ${EXAMPLE_ID} no encontrada`],
      ['/vacunas/{id}', `Vacuna con ID ${EXAMPLE_ID} no encontrada`],
      ['/medicamentos/{id}', `Medicamento con ID ${EXAMPLE_ID} no encontrado`],
    ])('%s: the 404 example names the right resource', (path, expected) => {
      for (const method of ['get', 'put', 'delete'] as Method[]) {
        expect(messageOf(path, method, '404')[0], method).toBe(expected);
      }
    });

    it.each(PET_RECORD_MODULES)('POST $base: 404 is the missing/foreign pet message', ({ base }) => {
      expect(messageOf(base, 'post', '404')).toEqual([`Mascota con ID ${EXAMPLE_ID} no encontrada`]);
    });

    it('PUT /mascotas/{id}: 404 lists the pet and the transfer-target messages', () => {
      expect(messageOf('/mascotas/{id}', 'put', '404')).toEqual([
        `Mascota con ID ${EXAMPLE_ID} no encontrada`,
        `El usuario con ID ${EXAMPLE_ID} no existe. No se puede transferir una mascota a un usuario inexistente`,
      ]);
    });

    it('403 examples use the exact messages of each route', () => {
      const roleMessage = 'No tienes permisos para realizar esta acción';
      expect(messageOf('/usuarios', 'get', '403')).toEqual([roleMessage]);
      expect(messageOf('/usuarios', 'post', '403')).toEqual([roleMessage]);
      expect(messageOf('/usuarios/{id}', 'delete', '403')).toEqual([roleMessage]);
      expect(messageOf('/usuarios/{id}', 'get', '403')).toEqual([
        'Solo puedes consultar tu propio usuario',
      ]);
      expect(messageOf('/usuarios/{id}', 'put', '403')).toEqual([
        'Solo puedes modificar tu propio usuario',
        'No tienes permisos para modificar el rol o el estado',
      ]);
      expect(messageOf('/mascotas', 'post', '403')).toEqual([
        'Solo puedes registrar mascotas a tu nombre',
      ]);
      expect(messageOf('/mascotas/{id}', 'put', '403')).toEqual([
        'Solo un administrador puede transferir la propiedad de una mascota',
      ]);
    });

    it('409 examples describe a duplicate email', () => {
      for (const [path, method] of [
        ['/auth/register', 'post'],
        ['/usuarios', 'post'],
        ['/usuarios/{id}', 'put'],
      ] as const) {
        expect(textOf(messageOf(path, method, '409')[0])).toMatch(
          /^El correo electrónico .+ ya se encuentra registrado$/,
        );
      }
    });

    describe('examples match what the API really returns', () => {
      it('401 on protected routes equals the JwtAuthGuard response', () => {
        let thrown: unknown;
        try {
          new JwtAuthGuard(new Reflector()).handleRequest(null, null);
        } catch (e) {
          thrown = e;
        }
        expect(thrown).toBeInstanceOf(HttpException);
        expect(examplesOf('/auth/me', 'get', '401')).toEqual([bodyOf(thrown)]);
        expect(examplesOf('/citas/{id}', 'delete', '401')).toEqual([bodyOf(thrown)]);
      });

      it('401 on POST /auth/login uses the AuthService credentials message', () => {
        expect(messageOf('/auth/login', 'post', '401')).toEqual([INVALID_CREDENTIALS_MESSAGE]);
      });

      it('403 from role checks equals the RolesGuard response', () => {
        const reflector = { getAllAndOverride: () => [RolUsuario.ADMIN] } as unknown as Reflector;
        const context = {
          getHandler: () => undefined,
          getClass: () => undefined,
          switchToHttp: () => ({ getRequest: () => ({ user: { rol: RolUsuario.DUENO } }) }),
        } as unknown as ExecutionContext;
        let thrown: unknown;
        try {
          new RolesGuard(reflector).canActivate(context);
        } catch (e) {
          thrown = e;
        }
        expect(thrown).toBeInstanceOf(HttpException);
        expect(examplesOf('/usuarios', 'get', '403')).toEqual([bodyOf(thrown)]);
      });

      it('400 for an invalid id equals the ParseUUIDPipe response', async () => {
        const thrown = await new ParseUUIDPipe()
          .transform('not-a-uuid', { type: 'param', data: 'id' })
          .catch((e: unknown) => e);
        expect(thrown).toBeInstanceOf(HttpException);
        expect(examplesOf('/vacunas/{id}', 'get', '400')).toEqual([bodyOf(thrown)]);
        expect(examplesOf('/vacunas/{id}', 'put', '400')).toContainEqual(bodyOf(thrown));
      });

      it('400 validation messages are produced by the real ValidationPipe', async () => {
        const pipe = new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        });
        const thrown = await pipe
          .transform({}, { type: 'body', metatype: RegisterDto })
          .catch((e: unknown) => e);
        const real = bodyOf(thrown) as ErrorExample;
        const [documented] = examplesOf('/auth/register', 'post', '400');
        expect(real.statusCode).toBe(documented.statusCode);
        expect(real.error).toBe(documented.error);
        expect(real.message).toEqual(expect.arrayContaining(documented.message as string[]));
      });
    });
  });

  describe('sensitive data', () => {
    it('no response schema exposes a password or hash', () => {
      for (const { path, method, operation } of allOps()) {
        for (const [status, response] of Object.entries(operation.responses)) {
          for (const media of Object.values(response.content ?? {})) {
            const props = reachableProps(media.schema);
            expect(props, `${method} ${path} ${status}`).not.toContain('password');
          }
        }
      }
    });

    it('password is only accepted in request bodies, as a write-only field', () => {
      const withPassword = Object.entries(doc.components?.schemas ?? {})
        .filter(([, s]) => (s as { properties?: object }).properties && 'password' in (s as { properties: object }).properties)
        .map(([name]) => name)
        .sort();
      expect(withPassword).toEqual(['CreateUsuarioDto', 'LoginDto', 'RegisterDto', 'UpdateUsuarioDto']);
      for (const name of withPassword) {
        expect(schema(name).properties.password).toMatchObject({ writeOnly: true, format: 'password' });
      }
    });

    it('contains no real-looking JWT, Bearer token or secret', () => {
      const text = JSON.stringify(doc);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{5,}/); // base64url JWT header
      expect(text).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{20,}/);
      expect(text).not.toContain('JWT_SECRET');
      expect(text).not.toMatch(/\$2[aby]\$\d{2}\$/); // bcrypt hash
      expect(schema('LoginDataDto').properties.accessToken.example).toBe('<token JWT>');
    });
  });
});

describe('Swagger enablement', () => {
  describe('isSwaggerEnabled', () => {
    it.each([
      [{ NODE_ENV: 'production' }, false],
      [{ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }, true],
      [{ NODE_ENV: 'production', SWAGGER_ENABLED: ' TRUE ' }, true],
      [{ NODE_ENV: 'production', SWAGGER_ENABLED: 'yes' }, false],
      [{ NODE_ENV: 'production', SWAGGER_ENABLED: '1' }, false],
      [{ NODE_ENV: 'development' }, true],
      [{ NODE_ENV: 'test' }, true],
      [{}, true],
      [{ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' }, false],
    ])('%j → %s', (env, enabled) => {
      expect(isSwaggerEnabled(env)).toBe(enabled);
    });
  });

  describe('setupSwagger (HTTP)', () => {
    let app: INestApplication;
    afterEach(async () => {
      await app?.close();
    });

    const start = async (env: Parameters<typeof setupSwagger>[1]) => {
      app = await createApp();
      const mounted = setupSwagger(app, env);
      await app.init();
      return mounted;
    };

    it('is disabled by default in production: no UI and no JSON document', async () => {
      expect(await start({ NODE_ENV: 'production' })).toBe(false);
      await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(404);
      await request(app.getHttpServer()).get(`/${SWAGGER_JSON_PATH}`).expect(404);
      await request(app.getHttpServer()).get(`/${SWAGGER_PATH}-yaml`).expect(404);
    });

    it('serves the UI and the JSON document in development', async () => {
      expect(await start({ NODE_ENV: 'development' })).toBe(true);
      const ui = await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`).redirects(1).expect(200);
      expect(ui.text).toContain('swagger-ui');
      const json = await request(app.getHttpServer()).get(`/${SWAGGER_JSON_PATH}`).expect(200);
      expect(json.body.info.title).toBe('PetCare API');
      expect(json.body.components.securitySchemes[BEARER_SCHEME]).toBeDefined();
      // Only JSON is exposed; the YAML variant is not mounted.
      await request(app.getHttpServer()).get(`/${SWAGGER_PATH}-yaml`).expect(404);
    });

    it('can be explicitly enabled in production with SWAGGER_ENABLED=true', async () => {
      expect(await start({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
      await request(app.getHttpServer()).get(`/${SWAGGER_JSON_PATH}`).expect(200);
    });

    it('can be explicitly disabled in development with SWAGGER_ENABLED=false', async () => {
      expect(await start({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })).toBe(false);
      await request(app.getHttpServer()).get(`/${SWAGGER_JSON_PATH}`).expect(404);
    });
  });
});
