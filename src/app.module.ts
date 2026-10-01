import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AlimentacionController } from './alimentacion/alimentacion.controller.js';
import { AlimentacionesService } from './alimentacion/alimentaciones.service.js';
import { CitasController } from './citas/citas.controller.js';
import { CitasService } from './citas/citas.service.js';
import { UsuariosController } from './usuarios/usuarios.controller.js';
import { UsuariosService } from './usuarios/usuarios.service.js';
import { VacunasController } from './vacunas/vacunas.controller.js';
import { VacunasService } from './vacunas/vacunas.service.js';
import { HistoriasClinicasController } from './historias-clinicas/historias-clinicas.controller.js';
import { HistoriasClinicasService } from './historias-clinicas/historias-clinicas.service.js';
import { MedicamentosController } from './medicamentos/medicamentos.controller.js';
import { MedicamentosService } from './medicamentos/medicamentos.service.js';
import { MascotasController } from './mascotas/mascotas.controller.js';
import { MascotasService } from './mascotas/mascotas.service.js';

@Module({
  imports: [],
  controllers: [
    AppController,
    AlimentacionController,
    CitasController,
    UsuariosController,
    VacunasController,
    HistoriasClinicasController,
    MedicamentosController,
    MascotasController,
  ],
  providers: [
    AppService,
    AlimentacionesService,
    CitasService,
    UsuariosService,
    VacunasService,
    HistoriasClinicasService,
    MedicamentosService,
    MascotasService,
  ],
})
export class AppModule {}
