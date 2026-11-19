import { randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { configureApp } from '../../src/app.setup.js';
import { getDatabaseConfig } from '../../src/config/database.config.js';
import {
  E2E_APPLIED_MARKER,
  E2eConfig,
  E2eConfigError,
  expectedAppEnvironment,
  loadE2eConfig,
} from './e2e-config.js';

export interface E2eContext {
  app: INestApplication;
  dataSource: DataSource;
  config: E2eConfig;
}

/**
 * Re-validates the configuration and checks that process.env still holds the
 * validated values, then resolves the database options exactly like the
 * application does (ConfigService over process.env + getDatabaseConfig).
 */
export function requireSafeE2eEnvironment(): E2eConfig {
  const config = loadE2eConfig();
  const problems: string[] = [];

  if (process.env[E2E_APPLIED_MARKER] !== config.database) {
    problems.push('The e2e setup file did not run (use `npm run test:e2e`).');
  }
  for (const [key, value] of Object.entries(expectedAppEnvironment(config))) {
    if (process.env[key] !== value) problems.push(`process.env.${key} was changed after validation.`);
  }

  const resolved = getDatabaseConfig(new ConfigService()) as Record<string, unknown>;
  if (
    resolved.database !== config.database ||
    resolved.host !== config.host ||
    resolved.port !== config.port ||
    resolved.username !== config.username ||
    resolved.synchronize !== true
  ) {
    problems.push('The application would not connect to the validated test database.');
  }

  if (problems.length) throw new E2eConfigError(problems);
  return config;
}

/**
 * Pre-flight connection with NO entities and synchronize disabled, so it cannot
 * create, alter or delete anything: it only checks that the validated
 * database exists, is reachable, and really is the one connected to.
 */
export async function verifyTestDatabase(config: E2eConfig): Promise<void> {
  const probe = new DataSource({
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    entities: [],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    connectTimeoutMS: 5000,
  });

  try {
    await probe.initialize();
  } catch (error) {
    const code = (error as { code?: string }).code;
    const hint =
      code === '3D000'
        ? `Database "${config.database}" does not exist. Create it manually (see test/e2e/README.md); the tests never create databases.`
        : code === '28P01'
          ? 'Authentication failed for the e2e database user.'
          : code === 'ECONNREFUSED'
            ? `PostgreSQL is not reachable at ${config.host}:${config.port}.`
            : `Could not connect to the e2e database (${code ?? 'unknown error'}).`;
    throw new Error(`End-to-end tests cannot start. ${hint}`);
  }

  try {
    const [{ db }] = (await probe.query('SELECT current_database() AS db')) as { db: string }[];
    if (db !== config.database) {
      throw new Error('End-to-end tests cannot start: connected to an unexpected database.');
    }
  } finally {
    await probe.destroy();
  }
}

/**
 * Boots the real AppModule against the validated test database with the same
 * HTTP configuration as main.ts. The module is imported only after every
 * safety check has passed.
 */
export async function createE2eApp(): Promise<E2eContext> {
  const config = requireSafeE2eEnvironment();
  await verifyTestDatabase(config);

  const { AppModule } = await import('../../src/app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app, {
    NODE_ENV: process.env.NODE_ENV,
    SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
  });
  await app.init();

  const dataSource = app.get(DataSource);
  const [{ db }] = await dataSource.query('SELECT current_database() AS db');
  if (dataSource.options.database !== config.database || db !== config.database) {
    await app.close();
    throw new Error('End-to-end tests aborted: the application is not using the test database.');
  }

  return { app, dataSource, config };
}

/**
 * Identifies the data created by one test run. Every user registered by the
 * suite gets a unique `e2e-<runId>-...@petcare-e2e.test` email, so cleanup can
 * delete exactly those users; their pets and pet records are removed by the
 * schema's ON DELETE CASCADE foreign keys.
 */
export class E2eRun {
  readonly runId = `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
  private sequence = 0;

  email(label: string): string {
    this.sequence += 1;
    return `e2e-${this.runId}-${label}-${this.sequence}@petcare-e2e.test`;
  }

  /** SQL LIKE pattern matching only this run's emails (runId is [a-z0-9]). */
  get emailPattern(): string {
    return `e2e-${this.runId}-%@petcare-e2e.test`;
  }

  async cleanup({ dataSource, config }: E2eContext): Promise<void> {
    if (dataSource.options.database !== config.database) {
      throw new Error('Cleanup refused: not connected to the validated test database.');
    }
    await dataSource.query('DELETE FROM usuarios WHERE email LIKE $1', [this.emailPattern]);

    const [{ remaining }] = await dataSource.query(
      'SELECT count(*)::int AS remaining FROM usuarios WHERE email LIKE $1',
      [this.emailPattern],
    );
    if (remaining !== 0) {
      throw new Error(`Cleanup left ${remaining} test users behind.`);
    }
  }
}
