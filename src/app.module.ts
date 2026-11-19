import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseAsyncConfig } from './config/database.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { MascotasModule } from './mascotas/mascotas.module.js';
import { AlimentacionModule } from './alimentacion/alimentacion.module.js';
import { CitasModule } from './citas/citas.module.js';
import { VacunasModule } from './vacunas/vacunas.module.js';
import { HistoriasClinicasModule } from './historias-clinicas/historias-clinicas.module.js';
import { MedicamentosModule } from './medicamentos/medicamentos.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync(databaseAsyncConfig),
    AuthModule,
    UsuariosModule,
    MascotasModule,
    CitasModule,
    HistoriasClinicasModule,
    AlimentacionModule,
    VacunasModule,
    MedicamentosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authenticate first (401), then check roles (403).
    // Every route requires a JWT unless it is marked with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
