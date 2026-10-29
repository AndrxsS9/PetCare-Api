import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoCita } from './cita.dto.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'citas' })
export class CitaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  mascotaId: string;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  fechaHora: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  motivo: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  lugarveterinaria: string;

  @Column({
    type: 'enum',
    enum: EstadoCita,
    default: EstadoCita.PROGRAMADA,
  })
  estado: EstadoCita;

  @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mascotaId' })
  mascota: MascotaEntity;
}
