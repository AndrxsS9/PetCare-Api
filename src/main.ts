import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  configureApp(app, {
    NODE_ENV: config.get<string>('NODE_ENV'),
    SWAGGER_ENABLED: config.get<string>('SWAGGER_ENABLED'),
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
