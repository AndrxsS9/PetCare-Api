import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EspecieMascota } from './mascota.dto.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';

@Entity({ name: 'mascotas' })
export class MascotaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  usuarioId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  nombre: string;

  @Column({
    type: 'enum',
    enum: EspecieMascota,
    default: EspecieMascota.OTRO,
  })
  especie: EspecieMascota;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  raza: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  fecha_nacimiento: Date;

  @Column({
    type: 'float',
    nullable: false,
  })
  peso: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: '',
  })
  fotoUrl: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  estado: boolean;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.mascotas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuarioId' })
  usuario: UsuarioEntity;
}

