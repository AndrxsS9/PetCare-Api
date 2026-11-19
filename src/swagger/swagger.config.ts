import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from './schemas/common.schema.js';

/** Swagger UI path (served at http://localhost:3000/api/docs). */
export const SWAGGER_PATH = 'api/docs';
/** Raw OpenAPI JSON, served only when the UI is enabled. */
export const SWAGGER_JSON_PATH = 'api/docs-json';
/** Name of the Bearer security scheme, shared by DocumentBuilder and @ApiBearerAuth. */
export const BEARER_SCHEME = 'jwt';
export const API_VERSION = '1.0.0';

/** Tag names, in display order. */
export const API_TAGS = {
  estado: 'Estado de la API',
  auth: 'Autenticación',
  usuarios: 'Usuarios',
  mascotas: 'Mascotas',
  citas: 'Citas',
  historias: 'Historias Clínicas',
  alimentacion: 'Alimentación',
  vacunas: 'Vacunas',
  medicamentos: 'Medicamentos',
} as const;

const DESCRIPTION = `
API REST para la gestión de mascotas: usuarios, mascotas, citas, historias clínicas,
alimentación, vacunas y medicamentos.

**Autenticación.** Salvo \`GET /\`, \`POST /auth/register\` y \`POST /auth/login\`, todos los
endpoints requieren un token JWT. Obtén el token con \`POST /auth/login\`, pulsa
**Authorize** y pega el valor de \`data.accessToken\` (sin el prefijo \`Bearer\`).

**Roles y propiedad de los recursos.**
- \`ADMIN\` puede consultar y gestionar todos los registros.
- \`DUENO\` y \`VETERINARIO\` solo acceden a sus propias mascotas y a los registros asociados a
  ellas. Los registros de mascotas ajenas se responden con **404**, igual que si no existieran.
- El registro público siempre crea usuarios con rol \`DUENO\`.
`.trim();

export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('PetCare API')
    .setDescription(DESCRIPTION)
    .setVersion(API_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token de acceso obtenido en POST /auth/login (válido por tiempo limitado).',
      },
      BEARER_SCHEME,
    )
    .addTag(API_TAGS.estado, 'Comprobación de que la API está en funcionamiento (público).')
    .addTag(API_TAGS.auth, 'Registro, inicio de sesión y perfil del usuario autenticado.')
    .addTag(API_TAGS.usuarios, 'Gestión de usuarios. Las operaciones dependen del rol.')
    .addTag(API_TAGS.mascotas, 'Mascotas. Los usuarios no ADMIN solo ven y gestionan las suyas.')
    .addTag(API_TAGS.citas, 'Citas veterinarias de las mascotas del usuario.')
    .addTag(API_TAGS.historias, 'Historias clínicas de las mascotas del usuario.')
    .addTag(API_TAGS.alimentacion, 'Planes de alimentación de las mascotas del usuario.')
    .addTag(API_TAGS.vacunas, 'Vacunas aplicadas a las mascotas del usuario.')
    .addTag(API_TAGS.medicamentos, 'Medicamentos de las mascotas del usuario.')
    .build();
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig(), {
    extraModels: [ErrorResponseDto],
  });
}

export interface SwaggerEnvironment {
  NODE_ENV?: string;
  SWAGGER_ENABLED?: string;
}

/**
 * Swagger is on by default outside production and off in production.
 * SWAGGER_ENABLED=true / false overrides the default explicitly; any other
 * value is ignored, so a typo can never expose the docs in production.
 */
export function isSwaggerEnabled(env: SwaggerEnvironment): boolean {
  const flag = env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return env.NODE_ENV !== 'production';
}

/**
 * Mounts Swagger UI and the JSON document when enabled. Returns whether it was
 * mounted. When disabled, neither the UI nor the JSON/YAML routes exist.
 */
export function setupSwagger(app: INestApplication, env: SwaggerEnvironment): boolean {
  if (!isSwaggerEnabled(env)) {
    return false;
  }

  SwaggerModule.setup(SWAGGER_PATH, app, () => createSwaggerDocument(app), {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    raw: ['json'],
    customSiteTitle: 'PetCare API · Documentación',
    swaggerOptions: {
      // Keep the token in memory only (not localStorage) for the current tab.
      persistAuthorization: false,
    },
  });

  return true;
}
