import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'medicamentos' })
export class MedicamentoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  mascotaId: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  nombreMedicamento: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  dosis: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  frecuencia: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  inicio: Date;

  @Column({
    type: 'date',
    nullable: false,
  })
  fin: Date;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones?: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  estado: boolean;

  @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mascotaId' })
  mascota: MascotaEntity;
}
