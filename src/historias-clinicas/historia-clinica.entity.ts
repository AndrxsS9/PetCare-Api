import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'historias_clinicas' })
export class HistoriaClinicaEntity {
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
  fechaConsulta: Date;

  @Column({
    type: 'text',
    nullable: false,
  })
  diagnostico: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones?: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  pesoRegistrado: number;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  veterinarioResponsable: string;

  @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mascotaId' })
  mascota: MascotaEntity;
}
