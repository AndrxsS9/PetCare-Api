import { INestApplication, ValidationPipe } from '@nestjs/common';
import { setupSwagger, SwaggerEnvironment } from './swagger/swagger.config.js';

/**
 * HTTP-level configuration shared by main.ts and the end-to-end tests, so the
 * e2e suite exercises exactly the same CORS, validation and Swagger setup as
 * the running application.
 */
export function configureApp(app: INestApplication, env: SwaggerEnvironment): void {
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger UI at /api/docs: on by default outside production, off in
  // production unless SWAGGER_ENABLED=true. Documentation only; the global
  // JWT and role guards are unaffected.
  setupSwagger(app, env);
}
