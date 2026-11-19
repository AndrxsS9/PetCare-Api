import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_JWT_EXPIRES_IN_SECONDS,
  getJwtExpiresIn,
  getJwtModuleOptions,
  getJwtSecret,
  JWT_ALGORITHM,
} from './jwt.config.js';

// Stub instead of a real ConfigService so values in process.env cannot leak in.
const configWith = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const SAFE_SECRET = 'Zq8vT1nR4kW7yB2mX5pL9sD3fG6hJ0cA-uE_iO';

describe('jwt.config', () => {
  describe('getJwtSecret', () => {
    it('returns a strong secret', () => {
      expect(getJwtSecret(configWith({ JWT_SECRET: SAFE_SECRET }))).toBe(SAFE_SECRET);
    });

    it('trims surrounding whitespace', () => {
      expect(getJwtSecret(configWith({ JWT_SECRET: `  ${SAFE_SECRET}  ` }))).toBe(SAFE_SECRET);
    });

    it('throws when JWT_SECRET is missing', () => {
      expect(() => getJwtSecret(configWith({}))).toThrow(/JWT_SECRET no está definido/);
    });

    it('throws when JWT_SECRET is empty or blank', () => {
      expect(() => getJwtSecret(configWith({ JWT_SECRET: '' }))).toThrow(/no está definido/);
      expect(() => getJwtSecret(configWith({ JWT_SECRET: '    ' }))).toThrow(/no está definido/);
    });

    it('throws when JWT_SECRET is shorter than 32 characters', () => {
      expect(() => getJwtSecret(configWith({ JWT_SECRET: 'short-secret' }))).toThrow(
        /al menos 32 caracteres/,
      );
    });

    it.each([
      'your_jwt_secret_here_your_jwt_secret_here',
      'change_me_change_me_change_me_change_me',
      'placeholder-value-for-the-jwt-signing-key',
      'example-secret-0123456789-abcdefghijklmnop',
    ])('rejects placeholder-looking secret %s', (secret) => {
      expect(() => getJwtSecret(configWith({ JWT_SECRET: secret }))).toThrow(/valor de ejemplo/);
    });

    it('rejects low-entropy secrets made of repeated characters', () => {
      expect(() => getJwtSecret(configWith({ JWT_SECRET: 'a'.repeat(64) }))).toThrow(
        /valor de ejemplo/,
      );
    });

    it('never includes the secret value in the error message', () => {
      const weak = 'tooShortButSecret';
      try {
        getJwtSecret(configWith({ JWT_SECRET: weak }));
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).not.toContain(weak);
      }
    });
  });

  describe('getJwtExpiresIn', () => {
    it('defaults to one hour', () => {
      expect(getJwtExpiresIn(configWith({}))).toBe(DEFAULT_JWT_EXPIRES_IN_SECONDS);
      expect(DEFAULT_JWT_EXPIRES_IN_SECONDS).toBe(3600);
    });

    it('accepts a valid number of seconds', () => {
      expect(getJwtExpiresIn(configWith({ JWT_EXPIRES_IN: '900' }))).toBe(900);
    });

    it.each(['abc', '1h', '-5', '10.5'])('rejects non-integer value %s', (value) => {
      expect(() => getJwtExpiresIn(configWith({ JWT_EXPIRES_IN: value }))).toThrow(
        /número entero/,
      );
    });

    it.each(['0', '59', '86401'])('rejects out-of-range value %s', (value) => {
      expect(() => getJwtExpiresIn(configWith({ JWT_EXPIRES_IN: value }))).toThrow(
        /debe estar entre/,
      );
    });
  });

  describe('getJwtModuleOptions', () => {
    it('sets an explicit HS256 algorithm for signing and verification', () => {
      const options = getJwtModuleOptions(configWith({ JWT_SECRET: SAFE_SECRET }));

      expect(JWT_ALGORITHM).toBe('HS256');
      expect(options.secret).toBe(SAFE_SECRET);
      expect(options.signOptions).toEqual({ algorithm: 'HS256', expiresIn: 3600 });
      expect(options.verifyOptions).toEqual({ algorithms: ['HS256'] });
    });

    it('fails securely when the secret is missing', () => {
      expect(() => getJwtModuleOptions(configWith({}))).toThrow(/JWT_SECRET/);
    });
  });
});
