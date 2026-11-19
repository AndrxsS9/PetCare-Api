import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VacunaEntity } from './vacuna.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { VacunasController } from './vacunas.controller.js';
import { VacunasService } from './vacunas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([VacunaEntity, MascotaEntity])],
  controllers: [VacunasController],
  providers: [VacunasService],
})
export class VacunasModule {}
