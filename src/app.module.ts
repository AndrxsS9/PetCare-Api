import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseAsyncConfig } from './config/database.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { MascotasModule } from './mascotas/mascotas.module.js';
import { AlimentacionModule } from './alimentacion/alimentacion.module.js';
import { CitasModule } from './citas/citas.module.js';
import { VacunasController } from './vacunas/vacunas.controller.js';
import { VacunasService } from './vacunas/vacunas.service.js';
import { HistoriasClinicasModule } from './historias-clinicas/historias-clinicas.module.js';
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
    CitasModule,
    HistoriasClinicasModule,
    AlimentacionModule,
  ],
  controllers: [
    AppController,
    VacunasController,
    MedicamentosController,
  ],
  providers: [
    AppService,
    VacunasService,
    MedicamentosService,
  ],
})
export class AppModule {}
