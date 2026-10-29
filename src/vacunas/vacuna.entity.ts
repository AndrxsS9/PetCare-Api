import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'vacunas' })
export class VacunaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'mascota_id',
    type: 'uuid',
    nullable: false,
  })
  mascota_id: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  nombreVacuna: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  fechaAplicacion: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  loteVacuna: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones?: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  proximaDosis: Date;

  @ManyToOne(() => MascotaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mascota_id' })
  mascota: MascotaEntity;
}
