import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const syncFromEnv = configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'petcare_db'),
    // synchronize is strictly disabled in production
    synchronize: isProduction ? false : syncFromEnv,
    logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
    autoLoadEntities: true,
    ssl: configService.get<string>('DB_SSL', 'false') === 'true'
      ? { rejectUnauthorized: false }
      : false,
  };
};

export const databaseAsyncConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
};
