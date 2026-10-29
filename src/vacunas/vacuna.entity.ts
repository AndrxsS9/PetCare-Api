/**
 * Entidad Vacuna
 *
 * NOTA PARA EL COMPAÑERO:
 * Esta clase debe ser implementada con los decoradores correspondientes de TypeORM.
 * Asegúrate de importar los decoradores necesarios desde 'typeorm' y la entidad
 * MascotaEntity desde '../mascotas/mascota.entity.js'.
 *
 * Decorador de clase pendiente:
 * - @Entity({ name: 'vacunas' })
 */
export class VacunaEntity {
  // TODO: Identificador de la vacuna
  // - Decorador: @PrimaryGeneratedColumn('uuid')
  // - Propiedad: id: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Clave primaria única generada automáticamente.

  // TODO: Mascota asociada (Identificador de clave foránea)
  // - Decorador: @Column({ name: 'mascota_id', type: 'uuid', nullable: false })
  // - Propiedad: mascota_id: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Identificador que vincula el registro de vacunación con la mascota (conservando compatibilidad con DTO y Modelo).

  // TODO: Nombre de la vacuna
  // - Decorador: @Column({ type: 'varchar', length: 150, nullable: false })
  // - Propiedad: nombreVacuna: string;
  // - Tipo de dato recomendado: string
  // - Nombre biológico o comercial del biológico aplicado (ej: Antirrábica, Séxtuple).

  // TODO: Fecha de aplicación
  // - Decorador: @Column({ type: 'date', nullable: false })
  // - Propiedad: fechaAplicacion: Date;
  // - Tipo de dato recomendado: Date (formato de fecha)
  // - Fecha en la que se administró la dosis a la mascota.

  // TODO: Lote de la vacuna
  // - Decorador: @Column({ type: 'varchar', length: 100, nullable: false })
  // - Propiedad: loteVacuna: string;
  // - Tipo de dato recomendado: string
  // - Código de lote del fabricante para trazabilidad farmacológica.

  // TODO: Observaciones
  // - Decorador: @Column({ type: 'text', nullable: true })
  // - Propiedad: observaciones?: string;
  // - Tipo de dato recomendado: string (opcional)
  // - Reacciones adversas observadas, recomendaciones o notas clínicas del veterinario.

  // TODO: Próxima dosis
  // - Decorador: @Column({ type: 'date', nullable: false })
  // - Propiedad: proximaDosis: Date;
  // - Tipo de dato recomendado: Date (formato de fecha)
  // - Fecha estimada para el refuerzo o siguiente aplicación del esquema de vacunación.

  // TODO: Relación con MascotaEntity
  // - Decoradores:
  //     @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  //     @JoinColumn({ name: 'mascota_id' })
  // - Propiedad: mascota: MascotaEntity;
  // - Tipo de relación: ManyToOne (múltiples registros de vacunas pertenecen a una mascota).
}

