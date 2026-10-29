/**
 * Entidad Cita
 *
 * NOTA PARA EL COMPAÑERO:
 * Esta clase debe ser implementada con los decoradores correspondientes de TypeORM.
 * Asegúrate de importar los decoradores necesarios desde 'typeorm', el enum EstadoCita
 * desde './cita.dto.js' y la entidad MascotaEntity desde '../mascotas/mascota.entity.js'.
 *
 * Decorador de clase pendiente:
 * - @Entity({ name: 'citas' })
 */
export class CitaEntity {
  // TODO: ID de la cita
  // - Decorador: @PrimaryGeneratedColumn('uuid')
  // - Propiedad: id: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Clave primaria única generada automáticamente.

  // TODO: Mascota asociada (Identificador de clave foránea)
  // - Decorador: @Column({ type: 'uuid', nullable: false })
  // - Propiedad: mascotaId: string;
  // - Tipo de dato recomendado: string (UUID)
  // - Identificador que referencia a la mascota a la que pertenece esta cita.

  // TODO: Fecha y hora de la cita
  // - Decorador: @Column({ type: 'timestamp', nullable: false })
  // - Propiedad: fechaHora: Date;
  // - Tipo de dato recomendado: Date (timestamp con zona horaria o fecha/hora completa)
  // - Fecha y hora en la que se llevará a cabo la atención veterinaria.

  // TODO: Motivo de consulta
  // - Decorador: @Column({ type: 'varchar', length: 255, nullable: false })
  // - Propiedad: motivo: string;
  // - Tipo de dato recomendado: string
  // - Razón o sintomatología principal por la que se solicita la cita médica.

  // TODO: Lugar de atención veterinaria
  // - Decorador: @Column({ type: 'varchar', length: 255, nullable: false })
  // - Propiedad: lugarveterinaria: string;
  // - Tipo de dato recomendado: string
  // - Consultorio, clínica, sede o dirección donde se realizará la atención.

  // TODO: Estado de la cita
  // - Decorador: @Column({ type: 'enum', enum: EstadoCita, default: EstadoCita.PROGRAMADA })
  // - Propiedad: estado: EstadoCita;
  // - Tipo de dato recomendado: EstadoCita (enum con valores PROGRAMADA, REALIZADA, CANCELADA, REPROGRAMADA)
  // - Valor por defecto sugerido: EstadoCita.PROGRAMADA.

  // TODO: Relación con MascotaEntity
  // - Decoradores:
  //     @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  //     @JoinColumn({ name: 'mascotaId' })
  // - Propiedad: mascota: MascotaEntity;
  // - Tipo de relación: ManyToOne (muchas citas pertenecen a una única mascota).
}

