import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../../src/config/database.config.js';
import {
  applyE2eEnvironment,
  E2E_APPLIED_MARKER,
  E2eConfigError,
  loadE2eConfig,
  validateE2eConfig,
} from './e2e-config.js';

/**
 * Unit tests (no database) for the e2e safety gate. They run with
 * `npm run test`, so the isolation rules are verified on every run even when
 * no PostgreSQL test database is available.
 */
const SECRET = 'e2e-unit-test-only-secret-Qx7Lm2Vb9Nc4Zt8Hk';
const valid = {
  E2E_DB_HOST: 'localhost',
  E2E_DB_PORT: '5432',
  E2E_DB_USERNAME: 'tester',
  E2E_DB_PASSWORD: 'super-secret-password',
  E2E_DB_NAME: 'petcare_test',
  E2E_DB_CONFIRM: 'petcare_test',
  E2E_JWT_SECRET: SECRET,
};

const problemsOf = (vars: Record<string, string | undefined>, ctx = {}) => {
  try {
    validateE2eConfig(vars, ctx);
    return '';
  } catch (error) {
    expect(error).toBeInstanceOf(E2eConfigError);
    return (error as Error).message;
  }
};

describe('e2e safety gate', () => {
  describe('validateE2eConfig', () => {
    it('accepts a complete local petcare_test configuration', () => {
      expect(validateE2eConfig(valid, { devDbName: 'petcare_db' })).toEqual({
        host: 'localhost',
        port: 5432,
        username: 'tester',
        password: 'super-secret-password',
        database: 'petcare_test',
        ssl: false,
        jwtSecret: SECRET,
      });
    });

    it('accepts petcare_test_<suffix> and an empty (trust-auth) password', () => {
      expect(
        validateE2eConfig({ ...valid, E2E_DB_NAME: 'petcare_test_ci', E2E_DB_CONFIRM: 'petcare_test_ci', E2E_DB_PASSWORD: '' })
          .database,
      ).toBe('petcare_test_ci');
    });

    it('refuses when nothing is configured, listing every required key', () => {
      const message = problemsOf({});
      for (const key of Object.keys(valid)) expect(message).toContain(`${key} is required`);
      expect(message).toContain('Nothing was connected');
    });

    it.each(['petcare_db', 'postgres', 'petcare', 'PETCARE_TEST', 'petcare_test-1', 'my_petcare_test', 'petcare_testing'])(
      'refuses the database name %s',
      (name) => {
        expect(problemsOf({ ...valid, E2E_DB_NAME: name, E2E_DB_CONFIRM: name })).toContain(
          'E2E_DB_NAME must be "petcare_test"',
        );
      },
    );

    it('requires E2E_DB_CONFIRM to repeat the database name', () => {
      expect(problemsOf({ ...valid, E2E_DB_CONFIRM: 'yes' })).toContain('E2E_DB_CONFIRM must repeat');
      expect(problemsOf({ ...valid, E2E_DB_CONFIRM: undefined })).toContain('E2E_DB_CONFIRM is required');
    });

    it('refuses the database configured as DB_NAME in .env', () => {
      expect(problemsOf(valid, { devDbName: 'petcare_test' })).toContain('same database as DB_NAME in .env');
    });

    it('refuses remote hosts unless explicitly allowed', () => {
      expect(problemsOf({ ...valid, E2E_DB_HOST: 'db.example.com' })).toContain('is not local');
      expect(
        validateE2eConfig({ ...valid, E2E_DB_HOST: 'db.example.com', E2E_ALLOW_REMOTE_DB: 'true' }).host,
      ).toBe('db.example.com');
    });

    it('refuses to run with NODE_ENV=production', () => {
      expect(problemsOf(valid, { nodeEnv: 'production' })).toContain('never run in production');
    });

    it.each(['abc', '0', '70000', '5432.5'])('refuses the port %s', (port) => {
      expect(problemsOf({ ...valid, E2E_DB_PORT: port })).toContain('E2E_DB_PORT must be an integer');
    });

    it('never includes the password or JWT secret in error messages', () => {
      const message = problemsOf({ ...valid, E2E_DB_NAME: 'petcare_db', E2E_DB_HOST: 'remote.example' });
      expect(message).not.toContain(valid.E2E_DB_PASSWORD);
      expect(message).not.toContain(SECRET);
    });
  });

  describe('loadE2eConfig', () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'petcare-e2e-'));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });
    const writeEnv = (name: string, vars: Record<string, string>) =>
      writeFileSync(join(dir, name), Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n'));

    it('refuses to start without .env.e2e or E2E_* variables', () => {
      expect(() => loadE2eConfig(dir, {})).toThrow(E2eConfigError);
    });

    it('never takes database values from .env', () => {
      writeEnv('.env', {
        DB_HOST: 'localhost',
        DB_NAME: 'petcare_db',
        DB_USERNAME: 'dev',
        DB_PASSWORD: 'dev-password',
        E2E_DB_NAME: 'petcare_test', // even E2E_* keys in .env are ignored
      });
      expect(() => loadE2eConfig(dir, {})).toThrow(/E2E_DB_HOST is required/);
    });

    it('reads .env.e2e', () => {
      writeEnv('.env.e2e', valid);
      expect(loadE2eConfig(dir, {}).database).toBe('petcare_test');
    });

    it('lets real E2E_* environment variables override the file', () => {
      writeEnv('.env.e2e', { ...valid, E2E_DB_PORT: '5432' });
      expect(loadE2eConfig(dir, { E2E_DB_PORT: '55432' }).port).toBe(55432);
    });

    it('refuses when .env.e2e targets the database named in .env', () => {
      writeEnv('.env.e2e', valid);
      writeEnv('.env', { DB_NAME: 'petcare_test' });
      expect(() => loadE2eConfig(dir, {})).toThrow(/same database as DB_NAME in \.env/);
    });
  });

  describe('applyE2eEnvironment', () => {
    it('sets every variable the app reads, so nothing can come from .env', () => {
      const target: Record<string, string | undefined> = {};
      applyE2eEnvironment(validateE2eConfig(valid), target);
      expect(target).toEqual({
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USERNAME: 'tester',
        DB_PASSWORD: 'super-secret-password',
        DB_NAME: 'petcare_test',
        DB_SYNCHRONIZE: 'true',
        DB_LOGGING: 'false',
        DB_SSL: 'false',
        JWT_SECRET: SECRET,
        JWT_EXPIRES_IN: '3600',
        SWAGGER_ENABLED: 'true',
        [E2E_APPLIED_MARKER]: 'petcare_test',
      });
    });

    it('makes the application resolve the test database with synchronize enabled', () => {
      const saved = { ...process.env };
      try {
        // Simulate values coming from a developer .env being already present.
        Object.assign(process.env, { DB_NAME: 'petcare_db', DB_HOST: 'dev-host', DB_SYNCHRONIZE: 'false' });
        applyE2eEnvironment(validateE2eConfig(valid));
        const resolved = getDatabaseConfig(new ConfigService()) as Record<string, unknown>;
        expect(resolved).toMatchObject({
          database: 'petcare_test',
          host: 'localhost',
          port: 5432,
          username: 'tester',
          synchronize: true,
          logging: false,
          ssl: false,
        });
      } finally {
        for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
        Object.assign(process.env, saved);
      }
    });
  });
});
