import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseAsyncConfig } from './config/database.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { MascotasModule } from './mascotas/mascotas.module.js';
import { AlimentacionController } from './alimentacion/alimentacion.controller.js';
import { AlimentacionesService } from './alimentacion/alimentaciones.service.js';
import { CitasController } from './citas/citas.controller.js';
import { CitasService } from './citas/citas.service.js';
import { VacunasController } from './vacunas/vacunas.controller.js';
import { VacunasService } from './vacunas/vacunas.service.js';
import { HistoriasClinicasController } from './historias-clinicas/historias-clinicas.controller.js';
import { HistoriasClinicasService } from './historias-clinicas/historias-clinicas.service.js';
import { MedicamentosController } from './medicamentos/medicamentos.controller.js';
import { MedicamentosService } from './medicamentos/medicamentos.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(databaseAsyncConfig),
    UsuariosModule,
    MascotasModule,
  ],
  controllers: [
    AppController,
    AlimentacionController,
    CitasController,
    VacunasController,
    HistoriasClinicasController,
    MedicamentosController,
  ],
  providers: [
    AppService,
    AlimentacionesService,
    CitasService,
    VacunasService,
    HistoriasClinicasService,
    MedicamentosService,
  ],
})
export class AppModule {}
