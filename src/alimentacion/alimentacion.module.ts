import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlimentacionEntity } from './alimentacion.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { AlimentacionController } from './alimentacion.controller.js';
import { AlimentacionesService } from './alimentaciones.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AlimentacionEntity, MascotaEntity])],
  controllers: [AlimentacionController],
  providers: [AlimentacionesService],
})
export class AlimentacionModule {}
