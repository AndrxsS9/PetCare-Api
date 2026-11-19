import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto, MessageResponseDto } from './schemas/common.schema.js';
import { BEARER_SCHEME } from './swagger.config.js';

/**
 * Documentation-only decorators. They add OpenAPI metadata and never change
 * runtime behavior: authentication is still enforced by the global
 * JwtAuthGuard, and roles/ownership by the existing guards and services.
 *
 * Every error response carries its own example body, built with the status
 * code and error name of that response, so Swagger UI never falls back to a
 * single shared example. The messages are the ones the API actually returns.
 */

/** Placeholder UUID used in example messages. */
export const EXAMPLE_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b';
export const EXAMPLE_EMAIL = 'maria.perez@example.com';

/** Standard reason phrases used by NestJS in the `error` field. */
export const HTTP_ERROR_NAMES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
} as const;
export type ErrorStatus = keyof typeof HTTP_ERROR_NAMES;

/** Runtime messages copied from the guards and pipes (verified by swagger.spec.ts). */
export const ERROR_MESSAGES = {
  invalidUuid: 'Validation failed (uuid is expected)',
  invalidBody: ['nombre should not be empty', 'email must be an email'],
  jwt: 'Token de acceso inválido, expirado o ausente',
  invalidCredentials: 'Credenciales inválidas',
  forbiddenRole: 'No tienes permisos para realizar esta acción',
  duplicateEmail: `El correo electrónico ${EXAMPLE_EMAIL} ya se encuentra registrado`,
} as const;

export const errorBody = (statusCode: ErrorStatus, message: string | readonly string[]) => ({
  statusCode,
  message,
  error: HTTP_ERROR_NAMES[statusCode],
});

/**
 * Error response documented with the shared ErrorResponseDto schema and one
 * example per possible message (a named example each when there are several).
 */
const ApiErrorResponse = (
  status: ErrorStatus,
  description: string,
  messages: readonly (string | readonly string[])[],
) => {
  const base = { status, description, type: ErrorResponseDto };
  if (messages.length === 1) {
    return ApiResponse({ ...base, example: errorBody(status, messages[0]) });
  }
  return ApiResponse({
    ...base,
    examples: Object.fromEntries(
      messages.map((message, i) => [
        `ejemplo${i + 1}`,
        {
          summary: Array.isArray(message) ? 'Errores de validación' : String(message),
          value: errorBody(status, message),
        },
      ]),
    ),
  });
};

/** Marks every operation of a controller (or one operation) as requiring the JWT. */
export const ApiJwtAuth = () =>
  applyDecorators(
    ApiBearerAuth(BEARER_SCHEME),
    ApiErrorResponse(401, 'Token JWT ausente, mal formado, inválido o expirado.', [ERROR_MESSAGES.jwt]),
  );

/** 401 of POST /auth/login: same message for every credential failure. */
export const ApiInvalidCredentials = () =>
  ApiErrorResponse(
    401,
    'Credenciales inválidas o cuenta inactiva (mismo mensaje en todos los casos).',
    [ERROR_MESSAGES.invalidCredentials],
  );

/** `{ message, data }` response, the format used by the API for single records. */
export const ApiMessageResponse = (
  status: number,
  model: Type<unknown>,
  message: string,
  description = message,
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['message', 'data'],
        properties: {
          message: { type: 'string', example: message },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );

/** `{ message }` response, used by DELETE operations. */
export const ApiDeletedResponse = (message: string) =>
  ApiResponse({
    status: 200,
    description: message,
    type: MessageResponseDto,
    example: { message },
  });

/** UUID path parameter `:id`. */
export const ApiUuidParam = (description: string) =>
  ApiParam({ name: 'id', description, format: 'uuid', type: String });

/** 400 for a body rejected by the global ValidationPipe. */
export const ApiBadRequest = (description = 'Datos inválidos: el cuerpo no cumple la validación.') =>
  ApiErrorResponse(400, description, [ERROR_MESSAGES.invalidBody]);

/** 400 for an `:id` rejected by ParseUUIDPipe. */
export const ApiBadUuid = () =>
  ApiErrorResponse(400, 'El parámetro id no es un UUID válido.', [ERROR_MESSAGES.invalidUuid]);

/** 400 for an invalid `:id` or an invalid body. */
export const ApiBadUuidOrBody = () =>
  ApiErrorResponse(
    400,
    'El parámetro id no es un UUID válido o el cuerpo no cumple la validación.',
    [ERROR_MESSAGES.invalidUuid, ERROR_MESSAGES.invalidBody],
  );

/**
 * 403. `messages` are the exact texts the route can return; by default the
 * RolesGuard message.
 */
export const ApiForbidden = (
  description: string,
  messages: readonly string[] = [ERROR_MESSAGES.forbiddenRole],
) => ApiErrorResponse(403, description, messages);

/** 404. `messages` are the exact texts the route can return. */
export const ApiNotFound = (description: string, messages: readonly string[]) =>
  ApiErrorResponse(404, description, messages);

/** 409 for a duplicate email. */
export const ApiConflict = (description: string) =>
  ApiErrorResponse(409, description, [ERROR_MESSAGES.duplicateEmail]);
