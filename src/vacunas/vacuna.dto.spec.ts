import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidatorOptions } from 'class-validator';
import { CreateVacunaDto, UpdateVacunaDto } from './vacuna.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.

type Dto = typeof CreateVacunaDto | typeof UpdateVacunaDto;

/** Returns the names of the properties that failed validation. */
const invalidFields = async (
  dto: Dto,
  plain: Record<string, unknown>,
  options?: ValidatorOptions,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(dto, plain), options);
  return errors.map((error) => error.property);
};

// Same options as the global ValidationPipe in main.ts.
const pipeOptions: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

// Column length limits from VacunaEntity.
const textLimits = [
  ['nombreVacuna', 150],
  ['loteVacuna', 100],
] as const;

const dateFields = ['fechaAplicacion', 'proximaDosis'] as const;

const validIsoDates = [
  '2024-01-10',
  '2024-02-29',
  '2024-01-10T10:30:00Z',
  '2024-01-10T10:30:00.000-05:00',
];

const invalidIsoDates: [string, unknown][] = [
  ['not a date', 'mañana'],
  ['a non-ISO format', '10/01/2024'],
  ['an impossible day', '2024-02-30'],
  ['a non-leap-year February 29', '2023-02-29'],
  ['an invalid month', '2024-13-01'],
  ['an ISO week date', '2024-W02-3'],
  ['an ISO ordinal date', '2024-010'],
  ['a year-month only', '2024-01'],
  ['an empty string', ''],
  ['a number', 20240110],
];

describe('CreateVacunaDto', () => {
  const validPayload = {
    mascota_id: '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11',
    nombreVacuna: 'Rabia',
    fechaAplicacion: '2024-01-10',
    loteVacuna: 'LOT-2024-001',
    observaciones: 'Sin reacciones adversas',
    proximaDosis: '2025-01-10',
  };

  it('accepts a valid payload', async () => {
    await expect(
      invalidFields(CreateVacunaDto, validPayload, pipeOptions),
    ).resolves.toEqual([]);
  });

  it.each([
    ['omitted', undefined],
    ['an empty string', ''],
  ])('accepts observaciones when %s', async (_label, observaciones) => {
    await expect(
      invalidFields(CreateVacunaDto, { ...validPayload, observaciones }),
    ).resolves.toEqual([]);
  });

  it.each(textLimits)(
    'accepts %s at exactly its %i-character limit',
    async (field, limit) => {
      await expect(
        invalidFields(CreateVacunaDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit),
        }),
      ).resolves.toEqual([]);
    },
  );

  describe.each(dateFields)('%s', (field) => {
    it.each(validIsoDates)('accepts %s', async (value) => {
      await expect(
        invalidFields(CreateVacunaDto, { ...validPayload, [field]: value }),
      ).resolves.toEqual([]);
    });

    it.each(invalidIsoDates)('rejects %s', async (_label, value) => {
      await expect(
        invalidFields(CreateVacunaDto, { ...validPayload, [field]: value }),
      ).resolves.toEqual([field]);
    });
  });

  it.each([
    ['mascota_id is not a UUID', { mascota_id: '12345' }, 'mascota_id'],
    ['mascota_id is empty', { mascota_id: '' }, 'mascota_id'],
    ['nombreVacuna is not a string', { nombreVacuna: 42 }, 'nombreVacuna'],
    ['loteVacuna is not a string', { loteVacuna: 1001 }, 'loteVacuna'],
    ['observaciones is not a string', { observaciones: 10 }, 'observaciones'],
  ])('rejects when %s', async (_label, override, field) => {
    await expect(
      invalidFields(CreateVacunaDto, { ...validPayload, ...override }),
    ).resolves.toEqual([field]);
  });

  it.each([
    'mascota_id',
    'nombreVacuna',
    'fechaAplicacion',
    'loteVacuna',
    'proximaDosis',
  ])('rejects when required field %s is missing', async (field) => {
    await expect(
      invalidFields(CreateVacunaDto, { ...validPayload, [field]: undefined }),
    ).resolves.toEqual([field]);
  });

  it.each(textLimits.map(([field]) => field))(
    'rejects when %s is an empty string',
    async (field) => {
      await expect(
        invalidFields(CreateVacunaDto, { ...validPayload, [field]: '' }),
      ).resolves.toEqual([field]);
    },
  );

  it.each(textLimits)(
    'rejects when %s exceeds %i characters',
    async (field, limit) => {
      await expect(
        invalidFields(CreateVacunaDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit + 1),
        }),
      ).resolves.toEqual([field]);
    },
  );

  it('rejects an id supplied by the client', async () => {
    await expect(
      invalidFields(
        CreateVacunaDto,
        { ...validPayload, id: '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c33' },
        pipeOptions,
      ),
    ).resolves.toEqual(['id']);
  });
});

describe('UpdateVacunaDto', () => {
  it.each([
    ['an empty body', {}],
    ['only nombreVacuna', { nombreVacuna: 'Moquillo' }],
    ['only proximaDosis', { proximaDosis: '2026-01-10' }],
    ['an ISO timestamp', { fechaAplicacion: '2024-01-10T10:30:00Z' }],
    ['an empty observaciones', { observaciones: '' }],
    ['nombreVacuna at 150 characters', { nombreVacuna: 'a'.repeat(150) }],
    ['loteVacuna at 100 characters', { loteVacuna: 'a'.repeat(100) }],
    [
      'several fields',
      { loteVacuna: 'LOT-2024-099', fechaAplicacion: '2024-03-05' },
    ],
  ])('accepts a partial update with %s', async (_label, body) => {
    await expect(
      invalidFields(UpdateVacunaDto, body, pipeOptions),
    ).resolves.toEqual([]);
  });

  it.each([
    ['nombreVacuna is empty', { nombreVacuna: '' }, 'nombreVacuna'],
    ['loteVacuna is empty', { loteVacuna: '' }, 'loteVacuna'],
    [
      'nombreVacuna exceeds 150 characters',
      { nombreVacuna: 'a'.repeat(151) },
      'nombreVacuna',
    ],
    [
      'loteVacuna exceeds 100 characters',
      { loteVacuna: 'a'.repeat(101) },
      'loteVacuna',
    ],
    ['observaciones is not a string', { observaciones: 5 }, 'observaciones'],
    [
      'fechaAplicacion is not a date',
      { fechaAplicacion: 'ayer' },
      'fechaAplicacion',
    ],
    [
      'proximaDosis is an impossible date',
      { proximaDosis: '2025-02-30' },
      'proximaDosis',
    ],
    [
      'proximaDosis is an empty string',
      { proximaDosis: '' },
      'proximaDosis',
    ],
  ])('rejects a partial update when %s', async (_label, body, field) => {
    await expect(invalidFields(UpdateVacunaDto, body)).resolves.toEqual([
      field,
    ]);
  });

  it.each([
    ['id', '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c33'],
    ['mascota_id', '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11'],
  ])('does not allow changing %s', async (field, value) => {
    await expect(
      invalidFields(
        UpdateVacunaDto,
        { nombreVacuna: 'Moquillo', [field]: value },
        pipeOptions,
      ),
    ).resolves.toEqual([field]);
  });
});
