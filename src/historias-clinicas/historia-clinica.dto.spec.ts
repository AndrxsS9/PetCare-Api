import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateHistoriaClinicaDto,
  UpdateHistoriaClinicaDto,
} from './historia-clinica.dto.js';

// Uses Vitest globals (enabled in vitest.config.ts) rather than importing
// from 'vitest', matching the other newer specs.

type Dto = typeof CreateHistoriaClinicaDto | typeof UpdateHistoriaClinicaDto;

/** Returns the names of the properties that failed validation. */
const invalidFields = async (
  dto: Dto,
  plain: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(dto, plain));
  return errors.map((error) => error.property);
};

describe('CreateHistoriaClinicaDto', () => {
  const validPayload = {
    mascotaId: '0b6f8a3e-3c1f-4a52-9a77-1f0d2e4b9c11',
    fechaConsulta: '2026-11-18T10:00:00.000Z',
    diagnostico: 'Buen estado general',
    observaciones: 'Continuar con alimentación actual',
    pesoRegistrado: 28.5,
    veterinarioResponsable: 'Dra. Ana Ruiz',
  };

  it('accepts a valid payload', async () => {
    await expect(
      invalidFields(CreateHistoriaClinicaDto, validPayload),
    ).resolves.toEqual([]);
  });

  it.each([
    ['omitted', undefined],
    ['an empty string', ''],
  ])('accepts observaciones when %s', async (_label, observaciones) => {
    await expect(
      invalidFields(CreateHistoriaClinicaDto, {
        ...validPayload,
        observaciones,
      }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['mascotaId is not a UUID', { mascotaId: '12345' }, 'mascotaId'],
    ['mascotaId is missing', { mascotaId: undefined }, 'mascotaId'],
    ['fechaConsulta is not a date', { fechaConsulta: 'ayer' }, 'fechaConsulta'],
    [
      'fechaConsulta is not ISO formatted',
      { fechaConsulta: '18/11/2026' },
      'fechaConsulta',
    ],
    ['diagnostico is empty', { diagnostico: '' }, 'diagnostico'],
    ['diagnostico is not a string', { diagnostico: 42 }, 'diagnostico'],
    ['observaciones is not a string', { observaciones: 7 }, 'observaciones'],
    ['pesoRegistrado is negative', { pesoRegistrado: -3 }, 'pesoRegistrado'],
    ['pesoRegistrado is zero', { pesoRegistrado: 0 }, 'pesoRegistrado'],
    [
      'pesoRegistrado is a numeric string',
      { pesoRegistrado: '28.5' },
      'pesoRegistrado',
    ],
    [
      'veterinarioResponsable is empty',
      { veterinarioResponsable: '' },
      'veterinarioResponsable',
    ],
    [
      'veterinarioResponsable is not a string',
      { veterinarioResponsable: 123 },
      'veterinarioResponsable',
    ],
    [
      'veterinarioResponsable exceeds 150 characters',
      { veterinarioResponsable: 'a'.repeat(151) },
      'veterinarioResponsable',
    ],
  ])('rejects when %s', async (_label, override, field) => {
    await expect(
      invalidFields(CreateHistoriaClinicaDto, { ...validPayload, ...override }),
    ).resolves.toEqual([field]);
  });

  it('accepts veterinarioResponsable at exactly 150 characters', async () => {
    await expect(
      invalidFields(CreateHistoriaClinicaDto, {
        ...validPayload,
        veterinarioResponsable: 'a'.repeat(150),
      }),
    ).resolves.toEqual([]);
  });
});

describe('UpdateHistoriaClinicaDto', () => {
  it.each([
    ['an empty body', {}],
    ['only diagnostico', { diagnostico: 'Otitis leve' }],
    ['only pesoRegistrado', { pesoRegistrado: 29.1 }],
    ['an empty observaciones', { observaciones: '' }],
    [
      'several fields',
      {
        fechaConsulta: '2026-12-01T08:30:00.000Z',
        veterinarioResponsable: 'Dr. Luis Gómez',
      },
    ],
  ])('accepts a partial update with %s', async (_label, body) => {
    await expect(
      invalidFields(UpdateHistoriaClinicaDto, body),
    ).resolves.toEqual([]);
  });

  it.each([
    ['fechaConsulta is not a date', { fechaConsulta: 'mañana' }, 'fechaConsulta'],
    ['diagnostico is empty', { diagnostico: '' }, 'diagnostico'],
    ['pesoRegistrado is negative', { pesoRegistrado: -1 }, 'pesoRegistrado'],
    ['pesoRegistrado is zero', { pesoRegistrado: 0 }, 'pesoRegistrado'],
    [
      'veterinarioResponsable is empty',
      { veterinarioResponsable: '' },
      'veterinarioResponsable',
    ],
    [
      'veterinarioResponsable exceeds 150 characters',
      { veterinarioResponsable: 'a'.repeat(151) },
      'veterinarioResponsable',
    ],
  ])('rejects a partial update when %s', async (_label, body, field) => {
    await expect(
      invalidFields(UpdateHistoriaClinicaDto, body),
    ).resolves.toEqual([field]);
  });
});
