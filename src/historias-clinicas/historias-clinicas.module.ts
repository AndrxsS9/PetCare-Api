import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaEntity } from './historia-clinica.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { HistoriasClinicasController } from './historias-clinicas.controller.js';
import { HistoriasClinicasService } from './historias-clinicas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([HistoriaClinicaEntity, MascotaEntity])],
  controllers: [HistoriasClinicasController],
  providers: [HistoriasClinicasService],
})
export class HistoriasClinicasModule {}
