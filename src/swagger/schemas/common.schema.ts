import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard NestJS error body. For 400 validation errors `message` is the list
 * of messages produced by the ValidationPipe; otherwise it is a single string.
 *
 * Deliberately has no property-level examples: this schema is shared by every
 * error status, so each response supplies its own example (see
 * api-docs.decorators.ts) with the matching status code and error name.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Código de estado HTTP (400, 401, 403, 404 o 409).' })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de error, o lista de mensajes de validación (400).',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Nombre del error HTTP.',
    enum: ['Bad Request', 'Unauthorized', 'Forbidden', 'Not Found', 'Conflict'],
  })
  error: string;
}

/** Body of successful DELETE operations. */
export class MessageResponseDto {
  @ApiProperty({ description: 'Mensaje de confirmación.', example: 'Registro eliminado con éxito' })
  message: string;
}
