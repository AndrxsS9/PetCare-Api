import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config.js';

describe('DatabaseConfig', () => {
  it('debe configurar synchronize: false cuando NODE_ENV sea production', () => {
    const configMap: Record<string, string> = {
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true', // Aunque diga true en la env, debe ser forzado a false en prod
      DB_HOST: 'prod-host',
      DB_PORT: '5432',
      DB_USERNAME: 'prod-user',
      DB_PASSWORD: 'prod-password',
      DB_NAME: 'prod-db',
    };

    const mockConfigService = {
      get: (key: string, defaultValue?: any) => configMap[key] ?? defaultValue,
    } as unknown as ConfigService;

    const config = getDatabaseConfig(mockConfigService);

    expect(config.synchronize).toBe(false);
    expect(config.type).toBe('postgres');
    expect(config.host).toBe('prod-host');
    expect(config.database).toBe('prod-db');
    expect(config.autoLoadEntities).toBe(true);
  });

  it('debe respetar DB_SYNCHRONIZE en ambientes de desarrollo', () => {
    const configMap: Record<string, string> = {
      NODE_ENV: 'development',
      DB_SYNCHRONIZE: 'true',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'password',
      DB_NAME: 'petcare_db',
    };

    const mockConfigService = {
      get: (key: string, defaultValue?: any) => configMap[key] ?? defaultValue,
    } as unknown as ConfigService;

    const config = getDatabaseConfig(mockConfigService);

    expect(config.synchronize).toBe(true);
    expect(config.type).toBe('postgres');
  });
});
