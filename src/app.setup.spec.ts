import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { configureApp } from './app.setup.js';

class EchoDto {
  @IsString()
  nombre: string;
}

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: EchoDto) {
    return body;
  }
}

/** configureApp is shared by main.ts and the e2e suite (no database). */
describe('configureApp', () => {
  let app: INestApplication;

  const start = async (env: Parameters<typeof configureApp>[1]) => {
    const module = await Test.createTestingModule({
      controllers: [AppController, EchoController],
      providers: [AppService],
    }).compile();
    app = module.createNestApplication();
    configureApp(app, env);
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
  });

  it('applies the global ValidationPipe (whitelist + forbidNonWhitelisted + transform)', async () => {
    await start({ NODE_ENV: 'test' });
    await request(app.getHttpServer()).post('/echo').send({ nombre: 'ok' }).expect(201, { nombre: 'ok' });
    await request(app.getHttpServer()).post('/echo').send({ nombre: 'ok', rol: 'ADMIN' }).expect(400);
    await request(app.getHttpServer()).post('/echo').send({ nombre: 7 }).expect(400);
  });

  it('enables CORS', async () => {
    await start({ NODE_ENV: 'test' });
    const res = await request(app.getHttpServer()).get('/').set('Origin', 'http://example.com').expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('mounts Swagger outside production and not in production', async () => {
    await start({ NODE_ENV: 'development' });
    await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    await app.close();

    await start({ NODE_ENV: 'production' });
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });
});
