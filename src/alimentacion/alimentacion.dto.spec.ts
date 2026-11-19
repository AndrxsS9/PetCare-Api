import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateAlimentacionDto,
  UpdateAlimentacionDto,
} from './alimentacion.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.

type Dto = typeof CreateAlimentacionDto | typeof UpdateAlimentacionDto;

/** Returns the names of the properties that failed validation. */
const invalidFields = async (
  dto: Dto,
  plain: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(dto, plain));
  return errors.map((error) => error.property);
};

// Column length limits from AlimentacionEntity.
const textLimits = [
  ['tipoAlimento', 100],
  ['marca', 100],
  ['unidad', 50],
  ['frecuencia', 100],
  ['horario', 100],
] as const;

describe('CreateAlimentacionDto', () => {
  const validPayload = {
    mascotaId: '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11',
    tipoAlimento: 'Concentrado',
    marca: 'Royal Canin',
    cantidad: 250,
    unidad: 'gramos',
    frecuencia: '2 veces al día',
    horario: '08:00 y 18:00',
    observaciones: 'Dividir la porción en dos comidas',
  };

  it('accepts a valid payload', async () => {
    await expect(
      invalidFields(CreateAlimentacionDto, validPayload),
    ).resolves.toEqual([]);
  });

  it('accepts a decimal cantidad', async () => {
    await expect(
      invalidFields(CreateAlimentacionDto, { ...validPayload, cantidad: 0.5 }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['omitted', undefined],
    ['an empty string', ''],
  ])('accepts observaciones when %s', async (_label, observaciones) => {
    await expect(
      invalidFields(CreateAlimentacionDto, { ...validPayload, observaciones }),
    ).resolves.toEqual([]);
  });

  it.each(textLimits)(
    'accepts %s at exactly its %i-character limit',
    async (field, limit) => {
      await expect(
        invalidFields(CreateAlimentacionDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit),
        }),
      ).resolves.toEqual([]);
    },
  );

  it.each([
    ['mascotaId is not a UUID', { mascotaId: '12345' }, 'mascotaId'],
    ['observaciones is not a string', { observaciones: 10 }, 'observaciones'],
    ['cantidad is zero', { cantidad: 0 }, 'cantidad'],
    ['cantidad is negative', { cantidad: -50 }, 'cantidad'],
    ['cantidad is a numeric string', { cantidad: '250' }, 'cantidad'],
  ])('rejects when %s', async (_label, override, field) => {
    await expect(
      invalidFields(CreateAlimentacionDto, { ...validPayload, ...override }),
    ).resolves.toEqual([field]);
  });

  it.each([
    'mascotaId',
    'tipoAlimento',
    'marca',
    'cantidad',
    'unidad',
    'frecuencia',
    'horario',
  ])('rejects when required field %s is missing', async (field) => {
    await expect(
      invalidFields(CreateAlimentacionDto, {
        ...validPayload,
        [field]: undefined,
      }),
    ).resolves.toEqual([field]);
  });

  it.each(textLimits.map(([field]) => field))(
    'rejects when %s is an empty string',
    async (field) => {
      await expect(
        invalidFields(CreateAlimentacionDto, { ...validPayload, [field]: '' }),
      ).resolves.toEqual([field]);
    },
  );

  it.each(textLimits)(
    'rejects when %s exceeds %i characters',
    async (field, limit) => {
      await expect(
        invalidFields(CreateAlimentacionDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit + 1),
        }),
      ).resolves.toEqual([field]);
    },
  );
});

describe('UpdateAlimentacionDto', () => {
  it.each([
    ['an empty body', {}],
    ['only cantidad', { cantidad: 300 }],
    ['only horario', { horario: '07:00, 13:00 y 19:00' }],
    ['an empty observaciones', { observaciones: '' }],
    ['several fields', { marca: 'Purina', unidad: 'tazas', cantidad: 1.5 }],
  ])('accepts a partial update with %s', async (_label, body) => {
    await expect(
      invalidFields(UpdateAlimentacionDto, body),
    ).resolves.toEqual([]);
  });

  it.each([
    ['cantidad is zero', { cantidad: 0 }, 'cantidad'],
    ['cantidad is negative', { cantidad: -1 }, 'cantidad'],
    ['cantidad is a numeric string', { cantidad: '300' }, 'cantidad'],
    ['tipoAlimento is empty', { tipoAlimento: '' }, 'tipoAlimento'],
    ['frecuencia is not a string', { frecuencia: 2 }, 'frecuencia'],
    ['marca exceeds 100 characters', { marca: 'a'.repeat(101) }, 'marca'],
    ['unidad exceeds 50 characters', { unidad: 'a'.repeat(51) }, 'unidad'],
  ])('rejects a partial update when %s', async (_label, body, field) => {
    await expect(
      invalidFields(UpdateAlimentacionDto, body),
    ).resolves.toEqual([field]);
  });
});
