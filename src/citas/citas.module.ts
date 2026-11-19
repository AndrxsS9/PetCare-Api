import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitaEntity } from './cita.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { CitasController } from './citas.controller.js';
import { CitasService } from './citas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CitaEntity, MascotaEntity])],
  controllers: [CitasController],
  providers: [CitasService],
})
export class CitasModule {}
