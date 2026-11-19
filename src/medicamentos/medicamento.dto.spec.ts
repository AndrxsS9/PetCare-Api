import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidatorOptions } from 'class-validator';
import {
  CreateMedicamentoDto,
  UpdateMedicamentoDto,
} from './medicamento.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.

type Dto = typeof CreateMedicamentoDto | typeof UpdateMedicamentoDto;

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

// Column length limits from MedicamentoEntity.
const textLimits = [
  ['nombreMedicamento', 150],
  ['dosis', 100],
  ['frecuencia', 100],
] as const;

const dateFields = ['inicio', 'fin'] as const;

const validIsoDates = [
  '2024-06-10',
  '2024-02-29',
  '2024-06-10T10:30:00Z',
  '2024-06-10T10:30:00.000-05:00',
];

const invalidIsoDates: [string, unknown][] = [
  ['not a date', 'mañana'],
  ['a non-ISO format', '10/06/2024'],
  ['an impossible day', '2024-02-30'],
  ['a non-leap-year February 29', '2023-02-29'],
  ['an invalid month', '2024-13-01'],
  ['an ISO week date', '2024-W02-3'],
  ['an ISO ordinal date', '2024-010'],
  ['a year-month only', '2024-06'],
  ['an empty string', ''],
  ['a number', 20240610],
];

describe('CreateMedicamentoDto', () => {
  const validPayload = {
    mascotaId: '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11',
    nombreMedicamento: 'Amoxicilina',
    dosis: '250 mg',
    frecuencia: 'Cada 12 horas',
    inicio: '2024-06-10',
    fin: '2024-06-17',
    observaciones: 'Administrar después de comer',
    estado: true,
  };

  it('accepts a valid payload', async () => {
    await expect(
      invalidFields(CreateMedicamentoDto, validPayload, pipeOptions),
    ).resolves.toEqual([]);
  });

  it.each([
    ['observaciones is omitted', { observaciones: undefined }],
    ['observaciones is empty', { observaciones: '' }],
    ['estado is omitted', { estado: undefined }],
    ['estado is false', { estado: false }],
  ])('accepts the payload when %s', async (_label, override) => {
    await expect(
      invalidFields(CreateMedicamentoDto, { ...validPayload, ...override }),
    ).resolves.toEqual([]);
  });

  it.each(textLimits)(
    'accepts %s at exactly its %i-character limit',
    async (field, limit) => {
      await expect(
        invalidFields(CreateMedicamentoDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit),
        }),
      ).resolves.toEqual([]);
    },
  );

  describe.each(dateFields)('%s', (field) => {
    it.each(validIsoDates)('accepts %s', async (value) => {
      await expect(
        invalidFields(CreateMedicamentoDto, {
          ...validPayload,
          [field]: value,
        }),
      ).resolves.toEqual([]);
    });

    it.each(invalidIsoDates)('rejects %s', async (_label, value) => {
      await expect(
        invalidFields(CreateMedicamentoDto, {
          ...validPayload,
          [field]: value,
        }),
      ).resolves.toEqual([field]);
    });
  });

  it.each([
    ['mascotaId is not a UUID', { mascotaId: '12345' }, 'mascotaId'],
    ['mascotaId is empty', { mascotaId: '' }, 'mascotaId'],
    [
      'nombreMedicamento is not a string',
      { nombreMedicamento: 42 },
      'nombreMedicamento',
    ],
    ['dosis is not a string', { dosis: 250 }, 'dosis'],
    ['frecuencia is not a string', { frecuencia: 12 }, 'frecuencia'],
    ['observaciones is not a string', { observaciones: 10 }, 'observaciones'],
    ['estado is the string "true"', { estado: 'true' }, 'estado'],
    ['estado is a number', { estado: 1 }, 'estado'],
  ])('rejects when %s', async (_label, override, field) => {
    await expect(
      invalidFields(CreateMedicamentoDto, { ...validPayload, ...override }),
    ).resolves.toEqual([field]);
  });

  it.each([
    'mascotaId',
    'nombreMedicamento',
    'dosis',
    'frecuencia',
    'inicio',
    'fin',
  ])('rejects when required field %s is missing', async (field) => {
    await expect(
      invalidFields(CreateMedicamentoDto, {
        ...validPayload,
        [field]: undefined,
      }),
    ).resolves.toEqual([field]);
  });

  it.each(textLimits.map(([field]) => field))(
    'rejects when %s is an empty string',
    async (field) => {
      await expect(
        invalidFields(CreateMedicamentoDto, { ...validPayload, [field]: '' }),
      ).resolves.toEqual([field]);
    },
  );

  it.each(textLimits)(
    'rejects when %s exceeds %i characters',
    async (field, limit) => {
      await expect(
        invalidFields(CreateMedicamentoDto, {
          ...validPayload,
          [field]: 'a'.repeat(limit + 1),
        }),
      ).resolves.toEqual([field]);
    },
  );

  it('rejects an id supplied by the client', async () => {
    await expect(
      invalidFields(
        CreateMedicamentoDto,
        { ...validPayload, id: '3e8b1f4c-6a2d-4c7e-9f0a-5b1c2d3e4f55' },
        pipeOptions,
      ),
    ).resolves.toEqual(['id']);
  });
});

describe('UpdateMedicamentoDto', () => {
  it.each([
    ['an empty body', {}],
    ['only dosis', { dosis: '500 mg' }],
    ['only fin', { fin: '2024-07-01' }],
    ['an ISO timestamp', { inicio: '2024-06-10T10:30:00Z' }],
    ['estado false', { estado: false }],
    ['estado true', { estado: true }],
    ['an empty observaciones', { observaciones: '' }],
    [
      'nombreMedicamento at 150 characters',
      { nombreMedicamento: 'a'.repeat(150) },
    ],
    ['frecuencia at 100 characters', { frecuencia: 'a'.repeat(100) }],
    [
      'several fields',
      { dosis: '1 tableta', frecuencia: 'Cada 8 horas', estado: false },
    ],
  ])('accepts a partial update with %s', async (_label, body) => {
    await expect(
      invalidFields(UpdateMedicamentoDto, body, pipeOptions),
    ).resolves.toEqual([]);
  });

  it.each([
    [
      'nombreMedicamento is empty',
      { nombreMedicamento: '' },
      'nombreMedicamento',
    ],
    ['dosis is empty', { dosis: '' }, 'dosis'],
    ['frecuencia is empty', { frecuencia: '' }, 'frecuencia'],
    [
      'nombreMedicamento exceeds 150 characters',
      { nombreMedicamento: 'a'.repeat(151) },
      'nombreMedicamento',
    ],
    ['dosis exceeds 100 characters', { dosis: 'a'.repeat(101) }, 'dosis'],
    [
      'frecuencia exceeds 100 characters',
      { frecuencia: 'a'.repeat(101) },
      'frecuencia',
    ],
    ['observaciones is not a string', { observaciones: 5 }, 'observaciones'],
    ['inicio is not a date', { inicio: 'ayer' }, 'inicio'],
    ['fin is an impossible date', { fin: '2024-02-30' }, 'fin'],
    ['fin is an empty string', { fin: '' }, 'fin'],
    ['estado is the string "false"', { estado: 'false' }, 'estado'],
    ['estado is a number', { estado: 0 }, 'estado'],
  ])('rejects a partial update when %s', async (_label, body, field) => {
    await expect(invalidFields(UpdateMedicamentoDto, body)).resolves.toEqual([
      field,
    ]);
  });

  it.each([
    ['id', '3e8b1f4c-6a2d-4c7e-9f0a-5b1c2d3e4f55'],
    ['mascotaId', '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11'],
  ])('does not allow changing %s', async (field, value) => {
    await expect(
      invalidFields(
        UpdateMedicamentoDto,
        { dosis: '500 mg', [field]: value },
        pipeOptions,
      ),
    ).resolves.toEqual([field]);
  });
});
