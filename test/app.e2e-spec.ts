import request from 'supertest';
import { createE2eApp, E2eContext } from './e2e/e2e-app.js';

describe('AppController (e2e)', () => {
  let ctx: E2eContext | undefined;

  beforeAll(async () => {
    ctx = await createE2eApp();
  });

  afterAll(async () => {
    await ctx?.app.close();
  });

  it('/ (GET) returns the health-check message', () => {
    return request(ctx!.app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('PetCare API funcionando!');
  });
});
