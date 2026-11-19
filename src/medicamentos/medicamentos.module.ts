import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicamentoEntity } from './medicamento.entity.js';
import { MascotaEntity } from '../mascotas/mascota.entity.js';
import { MedicamentosController } from './medicamentos.controller.js';
import { MedicamentosService } from './medicamentos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MedicamentoEntity, MascotaEntity])],
  controllers: [MedicamentosController],
  providers: [MedicamentosService],
})
export class MedicamentosModule {}
