/**
 * Entidad Historia Clínica
 *
 * NOTA PARA EL COMPAÑERO:
 * Esta clase debe ser implementada con los decoradores correspondientes de TypeORM.
 * Asegúrate de importar los decoradores necesarios desde 'typeorm' y la entidad
 * MascotaEntity desde '../mascotas/mascota.entity.js'.
 *
 * Decorador de clase pendiente:
 * - @Entity({ name: 'historias_clinicas' })
 */
export class HistoriaClinicaEntity {
  // TODO: Identificador de la historia clínica
  // - Decorador: @PrimaryGeneratedColumn('uuid')
  // - Propiedad: id: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Clave primaria única generada automáticamente.

  // TODO: Mascota asociada (Identificador de clave foránea)
  // - Decorador: @Column({ type: 'uuid', nullable: false })
  // - Propiedad: mascotaId: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Identificador que vincula el registro clínico con la mascota correspondiente.

  // TODO: Fecha de consulta
  // - Decorador: @Column({ type: 'timestamp', nullable: false })
  // - Propiedad: fechaConsulta: Date;
  // - Tipo de dato recomendado: Date (timestamp con fecha y hora de la consulta)
  // - Momento en el que se realizó la valoración médica.

  // TODO: Diagnóstico
  // - Decorador: @Column({ type: 'text', nullable: false })
  // - Propiedad: diagnostico: string;
  // - Tipo de dato recomendado: string (campo de texto amplio)
  // - Conclusión clínica o evaluación médica sobre el estado de la mascota.

  // TODO: Observaciones
  // - Decorador: @Column({ type: 'text', nullable: true })
  // - Propiedad: observaciones?: string;
  // - Tipo de dato recomendado: string (opcional)
  // - Notas adicionales, recomendaciones o signos relevantes durante la atención.

  // TODO: Peso registrado
  // - Decorador: @Column({ type: 'float', nullable: false })
  // - Propiedad: pesoRegistrado: number;
  // - Tipo de dato recomendado: number (float / decimal)
  // - Peso de la mascota en kilogramos al momento de la consulta.

  // TODO: Veterinario responsable
  // - Decorador: @Column({ type: 'varchar', length: 150, nullable: false })
  // - Propiedad: veterinarioResponsable: string;
  // - Tipo de dato recomendado: string
  // - Nombre completo o identificación del profesional veterinario que atendió a la mascota.

  // TODO: Relación con MascotaEntity
  // - Decoradores:
  //     @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  //     @JoinColumn({ name: 'mascotaId' })
  // - Propiedad: mascota: MascotaEntity;
  // - Tipo de relación: ManyToOne (múltiples historias clínicas pertenecen a una mascota).
}

