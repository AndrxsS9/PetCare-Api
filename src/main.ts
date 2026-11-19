import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './swagger/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  const config = app.get(ConfigService);
  setupSwagger(app, {
    NODE_ENV: config.get<string>('NODE_ENV'),
    SWAGGER_ENABLED: config.get<string>('SWAGGER_ENABLED'),
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
