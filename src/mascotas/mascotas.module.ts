import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MascotaEntity } from './mascota.entity.js';
import { MascotasController } from './mascotas.controller.js';
import { MascotasService } from './mascotas.service.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MascotaEntity, UsuarioEntity]),
    UsuariosModule,
  ],
  controllers: [MascotasController],
  providers: [MascotasService],
  exports: [MascotasService, TypeOrmModule],
})
export class MascotasModule {}
