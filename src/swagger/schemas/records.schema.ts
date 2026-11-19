import { ApiProperty } from '@nestjs/swagger';
import { EstadoCita } from '../../citas/cita.dto.js';

/**
 * Response shapes for the pet-related records. Fields match the TypeORM
 * entities; date-only columns (`date`) are returned as YYYY-MM-DD when read
 * from the database.
 */
const PET_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const DATE_NOTE =
  'Fecha de calendario. Al consultarla se devuelve como YYYY-MM-DD; en la respuesta de creación o actualización puede aparecer como fecha-hora ISO 8601.';

export class CitaDto {
  @ApiProperty({ format: 'uuid', example: '7d2c5e9a-1b4f-4c3d-8e6a-2f9b0c7d5e33' })
  id: string;

  @ApiProperty({ format: 'uuid', description: 'Mascota de la cita.', example: PET_ID })
  mascotaId: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-12-01T10:00:00.000Z' })
  fechaHora: string;

  @ApiProperty({ maxLength: 255, example: 'Control anual' })
  motivo: string;

  @ApiProperty({ maxLength: 255, example: 'Clínica Veterinaria Central' })
  lugarveterinaria: string;

  @ApiProperty({ enum: EstadoCita, enumName: 'EstadoCita', example: EstadoCita.PROGRAMADA })
  estado: EstadoCita;
}

export class HistoriaClinicaDto {
  @ApiProperty({ format: 'uuid', example: '1c9e7f5a-3b2d-4e6f-8a1b-5d4c3b2a1f09' })
  id: string;

  @ApiProperty({ format: 'uuid', example: PET_ID })
  mascotaId: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-01T09:00:00.000Z' })
  fechaConsulta: string;

  @ApiProperty({ example: 'Otitis externa leve' })
  diagnostico: string;

  @ApiProperty({ nullable: true, example: 'Limpieza diaria durante 7 días' })
  observaciones: string;

  @ApiProperty({ description: 'Peso registrado en kilogramos.', example: 12.3 })
  pesoRegistrado: number;

  @ApiProperty({ maxLength: 150, example: 'Dra. Laura Gómez' })
  veterinarioResponsable: string;
}

export class AlimentacionDto {
  @ApiProperty({ format: 'uuid', example: '5a1e7c2d-8f3b-4d6a-9c0e-3b2a1f4e6d77' })
  id: string;

  @ApiProperty({ format: 'uuid', example: PET_ID })
  mascotaId: string;

  @ApiProperty({ maxLength: 100, example: 'Concentrado' })
  tipoAlimento: string;

  @ApiProperty({ maxLength: 100, example: 'Marca Ejemplo' })
  marca: string;

  @ApiProperty({ example: 250 })
  cantidad: number;

  @ApiProperty({ maxLength: 50, example: 'gramos' })
  unidad: string;

  @ApiProperty({ maxLength: 100, example: '2 veces al día' })
  frecuencia: string;

  @ApiProperty({ maxLength: 100, example: '08:00 y 18:00' })
  horario: string;

  @ApiProperty({ nullable: true, example: 'Dividir la porción en dos comidas' })
  observaciones: string;
}

export class VacunaDto {
  @ApiProperty({ format: 'uuid', example: '7c4d2e1a-9b3f-4a6e-8d5c-2f1e0a9b8c33' })
  id: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Mascota vacunada. Este módulo usa el nombre `mascota_id`.',
    example: PET_ID,
  })
  mascota_id: string;

  @ApiProperty({ maxLength: 150, example: 'Antirrábica' })
  nombreVacuna: string;

  @ApiProperty({ type: String, format: 'date', description: DATE_NOTE, example: '2026-01-10' })
  fechaAplicacion: string;

  @ApiProperty({ maxLength: 100, example: 'LOTE-2026-001' })
  loteVacuna: string;

  @ApiProperty({ nullable: true, example: 'Sin reacciones adversas' })
  observaciones: string;

  @ApiProperty({ type: String, format: 'date', description: DATE_NOTE, example: '2027-01-10' })
  proximaDosis: string;
}

export class MedicamentoDto {
  @ApiProperty({ format: 'uuid', example: '2e8f6a4c-1d3b-4f5e-9a7c-6b5d4c3a2f18' })
  id: string;

  @ApiProperty({ format: 'uuid', example: PET_ID })
  mascotaId: string;

  @ApiProperty({ maxLength: 150, example: 'Amoxicilina' })
  nombreMedicamento: string;

  @ApiProperty({ maxLength: 100, example: '1 tableta de 250 mg' })
  dosis: string;

  @ApiProperty({ maxLength: 100, example: 'Cada 12 horas' })
  frecuencia: string;

  @ApiProperty({ type: String, format: 'date', description: DATE_NOTE, example: '2026-03-01' })
  inicio: string;

  @ApiProperty({ type: String, format: 'date', description: DATE_NOTE, example: '2026-03-10' })
  fin: string;

  @ApiProperty({ nullable: true, example: 'Administrar con comida' })
  observaciones: string;

  @ApiProperty({ description: 'Indica si el tratamiento está activo.', example: true })
  estado: boolean;
}
