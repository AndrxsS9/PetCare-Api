/**
 * Entidad Medicamento
 *
 * NOTA PARA EL COMPAÑERO:
 * Esta clase debe ser implementada con los decoradores correspondientes de TypeORM.
 * Asegúrate de importar los decoradores necesarios desde 'typeorm' y la entidad
 * MascotaEntity desde '../mascotas/mascota.entity.js'.
 *
 * Decorador de clase pendiente:
 * - @Entity({ name: 'medicamentos' })
 */
export class MedicamentoEntity {
  // TODO: Identificador del medicamento
  // - Decorador: @PrimaryGeneratedColumn('uuid')
  // - Propiedad: id: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Clave primaria única generada automáticamente.

  // TODO: Mascota asociada (Identificador de clave foránea)
  // - Decorador: @Column({ type: 'uuid', nullable: false })
  // - Propiedad: mascotaId: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Identificador que vincula el tratamiento farmacológico con la mascota receptora.

  // TODO: Nombre del medicamento
  // - Decorador: @Column({ type: 'varchar', length: 150, nullable: false })
  // - Propiedad: nombreMedicamento: string;
  // - Tipo de dato recomendado: string
  // - Nombre comercial o principio activo del fármaco recetado.

  // TODO: Dosis
  // - Decorador: @Column({ type: 'varchar', length: 100, nullable: false })
  // - Propiedad: dosis: string;
  // - Tipo de dato recomendado: string
  // - Cantidad y unidad de medida a administrar (ej: "5 ml", "1 tableta", "50 mg").

  // TODO: Frecuencia
  // - Decorador: @Column({ type: 'varchar', length: 100, nullable: false })
  // - Propiedad: frecuencia: string;
  // - Tipo de dato recomendado: string
  // - Intervalo de administración del fármaco (ej: "Cada 8 horas", "Una vez al día").

  // TODO: Fecha de inicio y finalización
  // - Decoradores:
  //     @Column({ type: 'date', nullable: false })
  //     inicio: Date;
  //     @Column({ type: 'date', nullable: false })
  //     fin: Date;
  // - Tipo de dato recomendado: Date (formato de fecha)
  // - Fechas que delimitan el período de duración del tratamiento farmacológico.

  // TODO: Observaciones
  // - Decorador: @Column({ type: 'text', nullable: true })
  // - Propiedad: observaciones?: string;
  // - Tipo de dato recomendado: string (opcional)
  // - Instrucciones especiales de administración (ej: "con comida") o efectos secundarios a vigilar.

  // TODO: Estado del tratamiento
  // - Decorador: @Column({ type: 'boolean', default: true })
  // - Propiedad: estado: boolean;
  // - Tipo de dato recomendado: boolean
  // - Indica si el tratamiento se encuentra activo (true) o si ya fue completado/suspendido (false).

  // TODO: Relación con MascotaEntity
  // - Decoradores:
  //     @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  //     @JoinColumn({ name: 'mascotaId' })
  // - Propiedad: mascota: MascotaEntity;
  // - Tipo de relación: ManyToOne (múltiples medicamentos/tratamientos pertenecen a una mascota).
}

