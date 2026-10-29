import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { RolUsuario } from './usuario.dto.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';

@Entity({ name: 'usuarios' })
export class UsuarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  password: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  telefono: string;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.DUENO,
  })
  rol: RolUsuario;

  @Column({
    type: 'boolean',
    default: true,
  })
  estado: boolean;

  @OneToMany(() => MascotaEntity, (mascota) => mascota.usuario)
  mascotas: MascotaEntity[];
}

