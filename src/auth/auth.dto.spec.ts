import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from './auth.dto.js';

const validRegister = {
  nombre: 'Ana Dueña',
  email: 'ana@petcare.com',
  password: 'password123',
  telefono: '3001112233',
};

// Same whitelist options as the global ValidationPipe in main.ts.
const errorsFor = async <T extends object>(cls: new () => T, plain: object) =>
  validate(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true });

const failedProps = (errors: Awaited<ReturnType<typeof validate>>) => errors.map((e) => e.property);

describe('Auth DTOs', () => {
  describe('RegisterDto', () => {
    it('accepts a valid payload', async () => {
      expect(await errorsFor(RegisterDto, validRegister)).toHaveLength(0);
    });

    it('rejects a client-supplied rol', async () => {
      const errors = await errorsFor(RegisterDto, { ...validRegister, rol: 'ADMIN' });
      expect(failedProps(errors)).toContain('rol');
    });

    it('rejects a client-supplied estado', async () => {
      const errors = await errorsFor(RegisterDto, { ...validRegister, estado: true });
      expect(failedProps(errors)).toContain('estado');
    });

    it.each(['nombre', 'email', 'password', 'telefono'])('requires %s', async (field) => {
      const payload: Record<string, unknown> = { ...validRegister };
      delete payload[field];
      expect(failedProps(await errorsFor(RegisterDto, payload))).toContain(field);
    });

    it('rejects an invalid email', async () => {
      const errors = await errorsFor(RegisterDto, { ...validRegister, email: 'no-es-correo' });
      expect(failedProps(errors)).toContain('email');
    });

    it('rejects passwords shorter than 6 or longer than 72 characters', async () => {
      expect(
        failedProps(await errorsFor(RegisterDto, { ...validRegister, password: '12345' })),
      ).toContain('password');
      expect(
        failedProps(await errorsFor(RegisterDto, { ...validRegister, password: 'x'.repeat(73) })),
      ).toContain('password');
    });
  });

  describe('LoginDto', () => {
    it('accepts a valid payload', async () => {
      expect(
        await errorsFor(LoginDto, { email: 'ana@petcare.com', password: 'password123' }),
      ).toHaveLength(0);
    });

    it('requires email and password', async () => {
      expect(failedProps(await errorsFor(LoginDto, {}))).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
    });

    it('rejects an invalid email', async () => {
      const errors = await errorsFor(LoginDto, { email: 'bad', password: 'password123' });
      expect(failedProps(errors)).toContain('email');
    });
  });
});
