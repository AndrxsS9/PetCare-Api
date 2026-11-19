import { ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions, JwtModuleOptions } from '@nestjs/jwt';

/** Only algorithm accepted for signing and verifying access tokens. */
export const JWT_ALGORITHM = 'HS256' as const;

/** Default access-token lifetime: one hour. */
export const DEFAULT_JWT_EXPIRES_IN_SECONDS = 3600;
export const MIN_JWT_EXPIRES_IN_SECONDS = 60;
export const MAX_JWT_EXPIRES_IN_SECONDS = 86400;

/** HS256 needs at least 256 bits of key material. */
export const MIN_JWT_SECRET_LENGTH = 32;

// Values that look like documentation placeholders must never be used as keys.
const PLACEHOLDER_PATTERN = /change[_-]?me|replace[_-]?(me|this|with)|your[_-]|placeholder|example/i;

/**
 * Reads JWT_SECRET and fails fast (throws) when it is missing or unsafe, so the
 * application can never boot with a weak or default signing key.
 * The secret value is never included in error messages.
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET')?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET no está definido. Configúralo en las variables de entorno.');
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET es inseguro: debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres.`,
    );
  }

  if (PLACEHOLDER_PATTERN.test(secret) || new Set(secret).size < 8) {
    throw new Error(
      'JWT_SECRET es inseguro: parece un valor de ejemplo. Genera un secreto aleatorio.',
    );
  }

  return secret;
}

/**
 * Reads JWT_EXPIRES_IN (seconds). Defaults to one hour and rejects values that
 * are not integers or fall outside a sane range.
 */
export function getJwtExpiresIn(configService: ConfigService): number {
  const raw = configService.get<string>('JWT_EXPIRES_IN')?.trim();

  if (!raw) {
    return DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error('JWT_EXPIRES_IN debe ser un número entero de segundos.');
  }

  const seconds = Number(raw);
  if (seconds < MIN_JWT_EXPIRES_IN_SECONDS || seconds > MAX_JWT_EXPIRES_IN_SECONDS) {
    throw new Error(
      `JWT_EXPIRES_IN debe estar entre ${MIN_JWT_EXPIRES_IN_SECONDS} y ${MAX_JWT_EXPIRES_IN_SECONDS} segundos.`,
    );
  }

  return seconds;
}

export function getJwtModuleOptions(configService: ConfigService): JwtModuleOptions {
  return {
    secret: getJwtSecret(configService),
    signOptions: {
      algorithm: JWT_ALGORITHM,
      expiresIn: getJwtExpiresIn(configService),
    },
    verifyOptions: {
      algorithms: [JWT_ALGORITHM],
    },
  };
}

export const jwtModuleAsyncOptions: JwtModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => getJwtModuleOptions(configService),
};
