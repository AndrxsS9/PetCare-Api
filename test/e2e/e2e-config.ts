import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Safety gate for the end-to-end suite.
 *
 * The e2e tests write to a real PostgreSQL database (TypeORM `synchronize`
 * plus inserts/deletes of their own records). This module makes sure that
 * database is an explicitly configured, disposable test database BEFORE the
 * Nest application is imported, compiled or connected:
 *
 * - Configuration comes only from E2E_* variables (`.env.e2e` or the process
 *   environment). Nothing falls back to the developer's `.env`.
 * - The database name must be `petcare_test` (or `petcare_test_<suffix>`), must
 *   be repeated in E2E_DB_CONFIRM, and must differ from DB_NAME in `.env`.
 * - The host must be local unless E2E_ALLOW_REMOTE_DB=true.
 * - Error messages never include passwords or secrets.
 */

export const E2E_ENV_FILE = '.env.e2e';
export const E2E_ENV_EXAMPLE = '.env.e2e.example';
export const TEST_DB_NAME_PATTERN = /^petcare_test(?:_[a-z0-9]+)?$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
/** Default DB_NAME of src/config/database.config.ts. */
const APP_DEFAULT_DB_NAME = 'petcare_db';
/** process.env key set once the configuration has been validated and applied. */
export const E2E_APPLIED_MARKER = 'PETCARE_E2E_VALIDATED_DB';

export interface E2eConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  jwtSecret: string;
}

export class E2eConfigError extends Error {
  constructor(problems: string[]) {
    super(
      [
        'End-to-end tests refused to start: unsafe or missing test database configuration.',
        ...problems.map((p) => `  - ${p}`),
        `Create ${E2E_ENV_FILE} from ${E2E_ENV_EXAMPLE} and point it to a dedicated, disposable PostgreSQL database named petcare_test.`,
        'Nothing was connected and no data was touched.',
      ].join('\n'),
    );
    this.name = 'E2eConfigError';
  }
}

type Vars = Record<string, string | undefined>;

export interface ValidationContext {
  /** DB_NAME of the developer's .env (the development database), if any. */
  devDbName?: string;
  /** NODE_ENV of the current process. */
  nodeEnv?: string;
}

/** Validates the E2E_* variables. Throws E2eConfigError listing every problem. */
export function validateE2eConfig(vars: Vars, context: ValidationContext = {}): E2eConfig {
  const problems: string[] = [];
  const required = (key: string, allowEmpty = false): string => {
    const value = vars[key];
    if (value === undefined || (!allowEmpty && value.trim() === '')) {
      problems.push(`${key} is required.`);
      return '';
    }
    return allowEmpty ? value : value.trim();
  };

  const host = required('E2E_DB_HOST');
  const portRaw = required('E2E_DB_PORT');
  const username = required('E2E_DB_USERNAME');
  // May be empty for local trust authentication, but must be declared.
  const password = required('E2E_DB_PASSWORD', true);
  const database = required('E2E_DB_NAME');
  const confirm = required('E2E_DB_CONFIRM');
  const jwtSecret = required('E2E_JWT_SECRET');

  const port = Number(portRaw);
  if (portRaw && (!/^\d+$/.test(portRaw) || port < 1 || port > 65535)) {
    problems.push('E2E_DB_PORT must be an integer between 1 and 65535.');
  }

  if (database && !TEST_DB_NAME_PATTERN.test(database)) {
    problems.push(
      `E2E_DB_NAME must be "petcare_test" (or "petcare_test_<suffix>"); got "${database}".`,
    );
  }
  if (database && confirm && confirm !== database) {
    problems.push('E2E_DB_CONFIRM must repeat E2E_DB_NAME exactly to confirm it is disposable.');
  }

  const devDbName = context.devDbName?.trim() || APP_DEFAULT_DB_NAME;
  if (database && database === devDbName) {
    problems.push('E2E_DB_NAME is the same database as DB_NAME in .env (development database).');
  }

  if (host && !LOCAL_HOSTS.has(host.toLowerCase()) && vars.E2E_ALLOW_REMOTE_DB !== 'true') {
    problems.push(
      'E2E_DB_HOST is not local (localhost, 127.0.0.1 or ::1). Set E2E_ALLOW_REMOTE_DB=true only for a dedicated test server.',
    );
  }

  const sslRaw = vars.E2E_DB_SSL?.trim() ?? 'false';
  if (sslRaw !== 'true' && sslRaw !== 'false') {
    problems.push('E2E_DB_SSL must be "true" or "false".');
  }

  if (context.nodeEnv === 'production') {
    problems.push('NODE_ENV is "production"; e2e tests never run in production.');
  }

  if (problems.length) {
    throw new E2eConfigError(problems);
  }

  return { host, port, username, password, database, ssl: sslRaw === 'true', jwtSecret };
}

function readEnvFile(path: string): Vars | undefined {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : undefined;
}

/**
 * Loads E2E_* variables from `.env.e2e` (or the file named by E2E_ENV_FILE),
 * with real environment variables taking precedence, and validates them.
 * The developer's `.env` is only read to compare its DB_NAME; it never
 * provides any value to the e2e configuration.
 */
export function loadE2eConfig(cwd = process.cwd(), env: Vars = process.env): E2eConfig {
  const file = readEnvFile(resolve(cwd, env.E2E_ENV_FILE ?? E2E_ENV_FILE)) ?? {};
  const fromEnv = Object.fromEntries(Object.entries(env).filter(([k]) => k.startsWith('E2E_')));
  const devEnv = readEnvFile(resolve(cwd, '.env'));

  return validateE2eConfig(
    { ...file, ...fromEnv },
    { devDbName: devEnv?.DB_NAME, nodeEnv: env.NODE_ENV },
  );
}

/**
 * Sets EVERY variable the application reads for its database, JWT and Swagger
 * configuration, so ConfigModule cannot take any of them from `.env`
 * (it only fills keys missing from process.env). Synchronize is enabled
 * because the target has been validated as the disposable test database.
 */
export function applyE2eEnvironment(config: E2eConfig, target: Vars = process.env): void {
  Object.assign(target, {
    NODE_ENV: 'test',
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USERNAME: config.username,
    DB_PASSWORD: config.password,
    DB_NAME: config.database,
    DB_SYNCHRONIZE: 'true',
    DB_LOGGING: 'false',
    DB_SSL: config.ssl ? 'true' : 'false',
    JWT_SECRET: config.jwtSecret,
    JWT_EXPIRES_IN: '3600',
    SWAGGER_ENABLED: 'true',
    [E2E_APPLIED_MARKER]: config.database,
  });
}

/** Keys that must hold exactly the validated values before the app is created. */
export function expectedAppEnvironment(config: E2eConfig): Vars {
  const expected: Vars = {};
  applyE2eEnvironment(config, expected);
  return expected;
}
