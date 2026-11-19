import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'alimentaciones' })
export class AlimentacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  mascotaId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  tipoAlimento: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  marca: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  cantidad: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  unidad: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  frecuencia: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  horario: string;

  @Column({
    type: 'text',
    nullable: true,
    default: '',
  })
  observaciones?: string;

  @ManyToOne('MascotaEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mascotaId' })
  mascota: MascotaEntity;
}
