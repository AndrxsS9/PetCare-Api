# PetCare API

API REST para la gestión integral del cuidado de mascotas: usuarios, mascotas, citas veterinarias, historias clínicas, planes de alimentación, vacunas y medicamentos.

Está construida con **NestJS** y **TypeScript**, y persiste la información en **PostgreSQL** mediante **TypeORM**.

---

## Tabla de contenido

1. [Tecnologías](#tecnologías)
2. [Módulos funcionales](#módulos-funcionales)
3. [Arquitectura y estructura de carpetas](#arquitectura-y-estructura-de-carpetas)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación](#instalación)
6. [Configuración del entorno](#configuración-del-entorno)
7. [Preparación de la base de datos local](#preparación-de-la-base-de-datos-local)
8. [Ejecución, compilación y pruebas](#ejecución-compilación-y-pruebas)
9. [Referencia de endpoints](#referencia-de-endpoints)
10. [Ejemplos de peticiones JSON](#ejemplos-de-peticiones-json)
11. [Códigos de respuesta HTTP](#códigos-de-respuesta-http)
12. [Colección de Postman](#colección-de-postman)
13. [Consideraciones de seguridad](#consideraciones-de-seguridad)
14. [Trabajo en equipo y Pull Requests](#trabajo-en-equipo-y-pull-requests)

---

## Tecnologías

| Tecnología | Uso en el proyecto |
| --- | --- |
| [NestJS](https://docs.nestjs.com) 12 | Framework del servidor (módulos, controladores, servicios, inyección de dependencias) |
| TypeScript | Lenguaje del proyecto (módulos ES, `"type": "module"`) |
| PostgreSQL | Base de datos relacional |
| TypeORM 1.x + `@nestjs/typeorm` | ORM: entidades, repositorios y relaciones |
| `@nestjs/config` | Carga de variables de entorno desde `.env` |
| `class-validator` / `class-transformer` | Validación de los cuerpos de las peticiones (DTO) |
| `bcrypt` | Cifrado de contraseñas de usuarios |
| Vitest + Supertest + `@nestjs/testing` | Pruebas unitarias y pruebas HTTP de controladores |

> `package.json` también incluye dependencias como `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `helmet` y `@nestjs/throttler`, pero **actualmente no se usan en el código fuente**: la API no tiene autenticación, documentación Swagger, cabeceras Helmet ni limitación de peticiones.

---

## Módulos funcionales

| Módulo | Ruta base | Descripción |
| --- | --- | --- |
| Usuarios | `/usuarios` | Dueños, veterinarios y administradores. Contraseñas cifradas con bcrypt; el correo es único. |
| Mascotas | `/mascotas` | Mascotas asociadas a un usuario existente. |
| Citas | `/citas` | Citas veterinarias de una mascota, con estado de la cita. |
| Historias Clínicas | `/historias-clinicas` | Consultas, diagnósticos y peso registrado de una mascota. |
| Alimentación | `/alimentaciones` | Plan de alimentación de una mascota (tipo, marca, cantidad, horario). |
| Vacunas | `/vacunas` | Vacunas aplicadas y fecha de la próxima dosis. |
| Medicamentos | `/medicamentos` | Tratamientos con dosis, frecuencia, fechas de inicio/fin y estado. |

Además, `GET /` responde con el texto `PetCare API funcionando!`, útil para comprobar que el servidor está en marcha.

### Relaciones

```text
Usuario 1 ── N Mascota 1 ── N Cita
                       ├── N HistoriaClinica
                       ├── N Alimentacion
                       ├── N Vacuna
                       └── N Medicamento
```

Todas las relaciones usan `ON DELETE CASCADE`: **eliminar un usuario elimina sus mascotas, y eliminar una mascota elimina todos sus registros asociados** (citas, historias clínicas, alimentación, vacunas y medicamentos).

---

## Arquitectura y estructura de carpetas

Cada módulo sigue la misma organización de NestJS:

- **Entidad** (`*.entity.ts`): tabla de PostgreSQL y sus relaciones TypeORM.
- **DTO** (`*.dto.ts`): contrato y reglas de validación de los cuerpos de entrada.
- **Controlador** (`*.controller.ts`): rutas HTTP.
- **Servicio** (`*.service.ts`): lógica de negocio y acceso a datos mediante repositorios TypeORM.
- **Módulo** (`*.module.ts`): registra controlador, servicio y entidades (`TypeOrmModule.forFeature`).
- **Pruebas** (`*.spec.ts`): junto al código que prueban.

```text
src/
├── main.ts                    # Arranque: CORS y ValidationPipe global
├── app.module.ts              # Módulo raíz: configuración y registro de módulos
├── app.controller.ts          # GET /
├── config/
│   └── database.config.ts     # Configuración de TypeORM a partir del .env
├── usuarios/
├── mascotas/
├── citas/
├── historias-clinicas/
├── alimentacion/              # Ruta HTTP: /alimentaciones
├── vacunas/
└── medicamentos/
postman/                       # Colección y entorno de Postman
test/                          # Prueba e2e (requiere base de datos)
```

### Validación global

`main.ts` registra un `ValidationPipe` global con:

- `whitelist: true`: elimina propiedades no declaradas en el DTO.
- `forbidNonWhitelisted: true`: en lugar de eliminarlas, **rechaza con 400** las peticiones que incluyan propiedades desconocidas.
- `transform: true`: convierte el cuerpo en una instancia del DTO.

Por eso, en los módulos donde el DTO de actualización no incluye `id` ni la mascota asociada, intentar cambiarlos devuelve `400`.

---

## Requisitos previos

- **Node.js**: 20.19 o superior en la rama 20, 22.13 o superior en la rama 22, o 24.11 o superior (requisitos de NestJS 12 y TypeORM 1.x).
- **npm** (incluido con Node.js).
- **PostgreSQL** en ejecución, con un usuario que pueda crear tablas en la base de datos del proyecto.
- Opcional: **Postman** para probar la API manualmente.

---

## Instalación

```bash
npm ci
```

`npm ci` instala exactamente las versiones fijadas en `package-lock.json`. Use `npm install` solo cuando necesite agregar o actualizar dependencias.

---

## Configuración del entorno

1. Copie el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

   En Windows (PowerShell): `Copy-Item .env.example .env`

2. Edite `.env` con sus valores. Variables disponibles (`.env.example` y `src/config/database.config.ts`):

| Variable | Valor por defecto en el código | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP de la API. |
| `NODE_ENV` | — | Con `production`, `synchronize` se fuerza a `false`. |
| `DB_HOST` | `localhost` | Servidor de PostgreSQL. |
| `DB_PORT` | `5432` | Puerto de PostgreSQL. |
| `DB_USERNAME` | `postgres` | Usuario de la base de datos. |
| `DB_PASSWORD` | `postgres` | Contraseña de la base de datos. **Defina siempre la suya.** |
| `DB_NAME` | `petcare_db` | Nombre de la base de datos. |
| `DB_SYNCHRONIZE` | `true` | Sincroniza automáticamente el esquema con las entidades (ver advertencia). |
| `DB_LOGGING` | `false` | Muestra en consola las consultas SQL. |
| `DB_SSL` | `false` | Con `true`, conecta por SSL (`rejectUnauthorized: false`). |

Ejemplo (solo valores de muestra):

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=petcare_db

# En producción, synchronize siempre es forzado a false
DB_SYNCHRONIZE=true
DB_LOGGING=false
DB_SSL=false
```

Las entidades se registran automáticamente (`autoLoadEntities: true`) a partir de cada `TypeOrmModule.forFeature`.

> ⚠️ **Sincronización de esquema.** Con `DB_SYNCHRONIZE=true`, TypeORM crea y **modifica** las tablas al arrancar para que coincidan con las entidades. Puede eliminar o alterar columnas y datos si una entidad cambia. Está pensada **solo para desarrollo**: no la active en bases de datos con información importante y mantenga `NODE_ENV=production` (que la desactiva) en producción.

---

## Preparación de la base de datos local

1. Cree la base de datos (por ejemplo, con `psql`):

   ```sql
   CREATE DATABASE petcare_db;
   ```

2. Las claves primarias son UUID generados por PostgreSQL con la extensión `uuid-ossp`. TypeORM intenta crearla automáticamente al conectarse; si el usuario configurado no tiene permisos suficientes, créela una vez como superusuario dentro de `petcare_db`:

   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

3. Con `DB_SYNCHRONIZE=true`, al iniciar la aplicación TypeORM crea las tablas `usuarios`, `mascotas`, `citas`, `historias_clinicas`, `alimentaciones`, `vacunas` y `medicamentos`. El proyecto no incluye migraciones ni datos de ejemplo.

---

## Ejecución, compilación y pruebas

| Comando | Descripción |
| --- | --- |
| `npm run start:dev` | Inicia la API en modo desarrollo con recarga automática. |
| `npm run start` | Inicia la API sin recarga automática. |
| `npm run build` | Compila el proyecto a `dist/` (excluye los archivos `*.spec.ts`). |
| `npm run start:prod` | Ejecuta la versión compilada (`node dist/main`); requiere `npm run build` previo. |
| `npm run test` | Ejecuta las pruebas automatizadas con Vitest. |
| `npm run test:watch` | Ejecuta las pruebas en modo observación. |
| `npm run test:cov` | Ejecuta las pruebas con informe de cobertura. |
| `npm run lint` | Analiza el código con oxlint. |

Con la configuración por defecto, la API queda disponible en `http://localhost:3000`.

### Pruebas automatizadas

`npm run test` ejecuta todos los archivos `src/**/*.spec.ts`:

- **Pruebas de servicios**: usan repositorios TypeORM simulados (*mocks*).
- **Pruebas de DTO**: verifican las reglas de validación.
- **Pruebas HTTP de controladores**: levantan la aplicación con Supertest y el mismo `ValidationPipe` de `main.ts`, con servicios simulados.

Estas pruebas **no necesitan PostgreSQL**.

`npm run test:e2e` ejecuta `test/app.e2e-spec.ts`, que carga el `AppModule` completo y, por tanto, **requiere una base de datos accesible**. Esa prueba todavía espera el texto `Hello World!` de la plantilla de NestJS, mientras que `GET /` responde `PetCare API funcionando!`, así que debe actualizarse antes de usarla.

---

## Referencia de endpoints

Todos los módulos exponen las mismas cinco operaciones:

| Método | Ruta | Acción | Éxito |
| --- | --- | --- | --- |
| `GET` | `/<recurso>` | Lista todos los registros | `200` + arreglo JSON |
| `GET` | `/<recurso>/:id` | Obtiene un registro por UUID | `200` + `{ message, data }` |
| `POST` | `/<recurso>` | Crea un registro | `201` + `{ message, data }` |
| `PUT` | `/<recurso>/:id` | Actualiza solo los campos enviados | `200` + `{ message, data }` |
| `DELETE` | `/<recurso>/:id` | Elimina un registro | `200` + `{ message }` |

Formato de las respuestas:

```jsonc
// GET /<recurso> → arreglo de registros
[{ "id": "…", "...": "..." }]

// GET /:id, POST y PUT
{ "message": "Vacuna encontrada", "data": { "id": "…", "...": "..." } }

// DELETE
{ "message": "Vacuna eliminada con éxito" }
```

### Usuarios — `/usuarios`

| Método | Ruta | Descripción | Errores |
| --- | --- | --- | --- |
| `GET` | `/usuarios` | Lista los usuarios (sin contraseñas). | — |
| `GET` | `/usuarios/:id` | Usuario con sus mascotas asociadas (sin contraseña). | `404` |
| `POST` | `/usuarios` | Registra un usuario; la contraseña se cifra con bcrypt. | `400`, `409` correo ya registrado |
| `PUT` | `/usuarios/:id` | Actualiza datos; si incluye `password`, se vuelve a cifrar. | `400`, `404`, `409` |
| `DELETE` | `/usuarios/:id` | Elimina el usuario **y en cascada sus mascotas y registros**. | `404` |

### Mascotas — `/mascotas`

| Método | Ruta | Descripción | Errores |
| --- | --- | --- | --- |
| `GET` | `/mascotas` | Lista las mascotas con su usuario dueño (sin contraseña). | — |
| `GET` | `/mascotas/:id` | Mascota con su usuario dueño. | `404` |
| `POST` | `/mascotas` | Registra una mascota; `usuarioId` debe existir. | `400`, `404` usuario inexistente |
| `PUT` | `/mascotas/:id` | Actualiza datos; permite transferirla a otro `usuarioId` existente. | `400`, `404` |
| `DELETE` | `/mascotas/:id` | Elimina la mascota **y en cascada sus registros**. | `404` |

> En Usuarios y Mascotas el `:id` de la ruta **no** se valida como UUID antes de llegar a la base de datos: un valor mal formado no devuelve `400`, sino un error de base de datos que la API responde como `500`.

### Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos

| Módulo | Rutas | Campo de la mascota |
| --- | --- | --- |
| Citas | `/citas`, `/citas/:id` | `mascotaId` |
| Historias Clínicas | `/historias-clinicas`, `/historias-clinicas/:id` | `mascotaId` |
| Alimentación | `/alimentaciones`, `/alimentaciones/:id` | `mascotaId` |
| Vacunas | `/vacunas`, `/vacunas/:id` | `mascota_id` (con guion bajo) |
| Medicamentos | `/medicamentos`, `/medicamentos/:id` | `mascotaId` |

En estos cinco módulos:

- El `:id` de `GET`, `PUT` y `DELETE` se valida con `ParseUUIDPipe`: un UUID mal formado devuelve **`400`** sin consultar la base de datos.
- `POST` verifica que la mascota exista (**`404`** si no existe).
- `PUT` no permite cambiar `id` ni la mascota asociada (**`400`** si se envían).
- `GET`, `PUT` y `DELETE` devuelven **`404`** si el registro no existe.

---

## Ejemplos de peticiones JSON

Los valores son **datos de ejemplo**. Sustituya los UUID por identificadores reales devueltos por la API.

Las fechas usan formato ISO 8601:

- Las columnas de tipo `date` (fecha de nacimiento, vacunas, medicamentos) usan `YYYY-MM-DD`.
- `fechaHora` (citas) y `fechaConsulta` (historias clínicas) admiten fecha y hora, por ejemplo `2026-12-01T10:00:00.000Z`.

### Usuarios

`POST /usuarios`

```json
{
  "nombre": "Usuario de Prueba",
  "email": "usuario.prueba@example.com",
  "password": "CambiarEsta123",
  "telefono": "3000000000",
  "rol": "DUENO",
  "estado": true
}
```

| Campo | Reglas |
| --- | --- |
| `nombre` | Texto obligatorio (columna de 100 caracteres). |
| `email` | Correo válido, obligatorio y único (columna de 150 caracteres). |
| `password` | Texto obligatorio, mínimo 6 caracteres. Nunca se devuelve en las respuestas. |
| `telefono` | Texto obligatorio (columna de 20 caracteres). |
| `rol` | Obligatorio: `DUENO`, `VETERINARIO` o `ADMIN`. |
| `estado` | Booleano opcional; por defecto `true`. |

`PUT /usuarios/:id` (todos los campos son opcionales):

```json
{
  "telefono": "3001112233",
  "rol": "VETERINARIO"
}
```

> Las longitudes máximas de Usuarios y Mascotas son límites de las columnas, no del DTO: un valor más largo no se rechaza con `400`, sino que produce un error de base de datos.

### Mascotas

`POST /mascotas`

```json
{
  "usuarioId": "00000000-0000-4000-8000-000000000001",
  "nombre": "Mascota de Prueba",
  "especie": "PERRO",
  "raza": "Criollo",
  "fecha_nacimiento": "2022-03-15",
  "peso": 12.5,
  "fotoUrl": "https://example.com/foto-mascota.jpg",
  "estado": true
}
```

| Campo | Reglas |
| --- | --- |
| `usuarioId` | UUID obligatorio de un usuario existente. |
| `nombre`, `raza` | Texto obligatorio (columnas de 100 caracteres). |
| `especie` | Obligatorio: `PERRO`, `GATO`, `AVE` u `OTRO`. |
| `fecha_nacimiento` | Fecha ISO obligatoria (`YYYY-MM-DD`). |
| `peso` | Número positivo obligatorio. |
| `fotoUrl` | Texto opcional (columna de 255 caracteres); por defecto `""`. |
| `estado` | Booleano opcional; por defecto `true`. |

`PUT /mascotas/:id` (todos opcionales, incluido `usuarioId` para transferir la mascota):

```json
{
  "peso": 13.2
}
```

### Citas

`POST /citas`

```json
{
  "mascotaId": "00000000-0000-4000-8000-000000000002",
  "fechaHora": "2026-12-01T10:00:00.000Z",
  "motivo": "Control anual",
  "lugarveterinaria": "Clínica Veterinaria de Prueba",
  "estado": "PROGRAMADA"
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota existente. |
| `fechaHora` | Fecha y hora ISO 8601 obligatoria. |
| `motivo`, `lugarveterinaria` | Texto obligatorio, no vacío, máximo 255 caracteres. |
| `estado` | Opcional: `PROGRAMADA` (por defecto), `REALIZADA`, `CANCELADA` o `REPROGRAMADA`. |

`PUT /citas/:id` (`fechaHora`, `motivo`, `lugarveterinaria` y `estado` son opcionales):

```json
{
  "estado": "REALIZADA"
}
```

### Historias Clínicas

`POST /historias-clinicas`

```json
{
  "mascotaId": "00000000-0000-4000-8000-000000000002",
  "fechaConsulta": "2026-11-18T10:00:00.000Z",
  "diagnostico": "Control general sin hallazgos",
  "observaciones": "Registro de prueba",
  "pesoRegistrado": 12.4,
  "veterinarioResponsable": "Veterinario de Prueba"
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota existente. |
| `fechaConsulta` | Fecha ISO 8601 obligatoria. |
| `diagnostico` | Texto obligatorio, no vacío. |
| `observaciones` | Texto opcional. |
| `pesoRegistrado` | Número positivo obligatorio. |
| `veterinarioResponsable` | Texto obligatorio, no vacío, máximo 150 caracteres. |

`PUT /historias-clinicas/:id` (todos opcionales excepto que no se puede cambiar `mascotaId`):

```json
{
  "diagnostico": "Control general, seguimiento en 6 meses"
}
```

### Alimentación

`POST /alimentaciones`

```json
{
  "mascotaId": "00000000-0000-4000-8000-000000000002",
  "tipoAlimento": "Concentrado",
  "marca": "Marca de Prueba",
  "cantidad": 250,
  "unidad": "gramos",
  "frecuencia": "2 veces al día",
  "horario": "08:00 y 18:00",
  "observaciones": "Registro de prueba"
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota existente. |
| `tipoAlimento`, `marca`, `frecuencia`, `horario` | Texto obligatorio, no vacío, máximo 100 caracteres. |
| `cantidad` | Número positivo obligatorio (admite decimales). |
| `unidad` | Texto obligatorio, no vacío, máximo 50 caracteres. |
| `observaciones` | Texto opcional; por defecto `""`. |

`PUT /alimentaciones/:id`:

```json
{
  "cantidad": 300
}
```

### Vacunas

`POST /vacunas`. **Atención:** la mascota se indica con `mascota_id`, con guion bajo.

```json
{
  "mascota_id": "00000000-0000-4000-8000-000000000002",
  "nombreVacuna": "Rabia",
  "fechaAplicacion": "2026-01-10",
  "loteVacuna": "LOTE-PRUEBA-001",
  "observaciones": "Registro de prueba",
  "proximaDosis": "2027-01-10"
}
```

| Campo | Reglas |
| --- | --- |
| `mascota_id` | UUID obligatorio de una mascota existente. |
| `nombreVacuna` | Texto obligatorio, no vacío, máximo 150 caracteres. |
| `loteVacuna` | Texto obligatorio, no vacío, máximo 100 caracteres. |
| `fechaAplicacion`, `proximaDosis` | Fecha ISO obligatoria que empiece por `YYYY-MM-DD` y sea real (`2024-02-30` se rechaza). |
| `observaciones` | Texto opcional; por defecto `""`. |

`PUT /vacunas/:id`:

```json
{
  "loteVacuna": "LOTE-PRUEBA-002"
}
```

### Medicamentos

`POST /medicamentos`

```json
{
  "mascotaId": "00000000-0000-4000-8000-000000000002",
  "nombreMedicamento": "Medicamento de Prueba",
  "dosis": "250 mg",
  "frecuencia": "Cada 12 horas",
  "inicio": "2026-06-10",
  "fin": "2026-06-17",
  "observaciones": "Registro de prueba",
  "estado": true
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota existente. |
| `nombreMedicamento` | Texto obligatorio, no vacío, máximo 150 caracteres. |
| `dosis`, `frecuencia` | Texto obligatorio, no vacío, máximo 100 caracteres. |
| `inicio`, `fin` | Fecha ISO obligatoria que empiece por `YYYY-MM-DD` y sea real. |
| `observaciones` | Texto opcional; por defecto `""`. |
| `estado` | Booleano opcional (`true`/`false`, no texto); por defecto `true`. |

`PUT /medicamentos/:id`:

```json
{
  "estado": false
}
```

En Vacunas y Medicamentos se conserva el día de calendario enviado sin importar la zona horaria del servidor, y las consultas devuelven estas fechas como `YYYY-MM-DD`.

---

## Códigos de respuesta HTTP

| Código | Cuándo ocurre |
| --- | --- |
| `200 OK` | `GET`, `PUT` y `DELETE` exitosos. |
| `201 Created` | `POST` exitoso. |
| `400 Bad Request` | Cuerpo inválido (campo obligatorio ausente, tipo o formato incorrecto, valor fuera de límites, fecha inválida, enumeración no válida), propiedad no permitida o desconocida, o `:id` mal formado en Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos. |
| `404 Not Found` | El registro no existe, o no existe el usuario/mascota asociado al crear o actualizar. |
| `409 Conflict` | Usuarios: el correo electrónico ya está registrado. |
| `500 Internal Server Error` | Errores no controlados; por ejemplo, un `:id` que no es UUID en Usuarios o Mascotas, o un texto más largo que su columna en esos dos módulos. |

Ejemplos de cuerpos de error:

```json
{
  "message": ["nombreVacuna should not be empty"],
  "error": "Bad Request",
  "statusCode": 400
}
```

```json
{
  "message": "Vacuna con ID 00000000-0000-4000-8000-000000000099 no encontrada",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Colección de Postman

Archivos incluidos en la carpeta `postman/`:

- `PetCare-API.postman_collection.json`: colección (formato v2.1) con una carpeta por módulo y las cinco operaciones de cada uno.
- `PetCare-Local.postman_environment.json`: entorno opcional con `baseUrl = http://localhost:3000`.

### Importar

1. En Postman: **Import** → seleccione los dos archivos de `postman/`.
2. Opcional: seleccione el entorno **PetCare Local** en la esquina superior derecha.
3. Inicie la API (`npm run start:dev`) con la base de datos configurada.

### Variables de la colección

| Variable | Uso |
| --- | --- |
| `baseUrl` | URL de la API (`http://localhost:3000`). |
| `usuarioId`, `mascotaId`, `citaId`, `historiaClinicaId`, `alimentacionId`, `vacunaId`, `medicamentoId` | Se rellenan automáticamente con los scripts de prueba de cada `POST`. |
| `usuarioPassword` | Contraseña de muestra para el usuario de prueba. No use contraseñas reales. |
| `permitirEliminacion` | `false` por defecto. Las peticiones `DELETE` se omiten mientras no la cambie a `true`. |

### Orden recomendado

1. **Usuarios → Crear usuario**: guarda `usuarioId`. El correo incluye una marca de tiempo para no repetirse.
2. **Mascotas → Crear mascota**: usa `usuarioId` y guarda `mascotaId`.
3. **Crear registros** en Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos: usan `mascotaId` y guardan su propio ID.
4. **Consultar y actualizar**: `GET` por ID, `GET` de colección y `PUT` de cada módulo.
5. **Opcional: eliminar solo los registros de prueba.** Cambie `permitirEliminacion` a `true` y ejecute manualmente los `DELETE`, empezando por los registros dependientes (medicamentos, vacunas, etc.), luego la mascota y por último el usuario. Recuerde que eliminar un usuario o una mascota borra en cascada sus registros asociados. Vuelva a poner `permitirEliminacion` en `false` al terminar.

Cada petición incluye pruebas que verifican el código HTTP, la estructura de la respuesta, el ID devuelto y, en los `PUT`, que el valor actualizado se haya guardado.

Las variables de ID solo se rellenan con lo que crea la propia colección, de modo que los `DELETE` apuntan a esos registros de prueba. Con el **Collection Runner** puede ejecutar la colección completa en el orden anterior; los `DELETE` se omiten mientras `permitirEliminacion` sea `false`.

> Use la colección contra una base de datos de desarrollo. No la ejecute contra datos reales.

---

## Consideraciones de seguridad

- **Sin autenticación ni autorización.** Todos los endpoints son públicos: cualquier cliente con acceso a la API puede consultar, crear, modificar o eliminar datos, y el campo `rol` de los usuarios no restringe ningún permiso. No exponga la API a Internet en su estado actual.
- **Contraseñas.** Se almacenan cifradas con bcrypt y no se incluyen en las respuestas de Usuarios ni en el usuario dueño que acompaña a cada mascota.
- **Variables de entorno.** El archivo `.env` está en `.gitignore`: no lo suba al repositorio ni comparta credenciales reales. Use `.env.example` solo con valores de muestra y defina una contraseña segura en `DB_PASSWORD`, ya que el código usa `postgres` si falta.
- **Sincronización de esquema.** Mantenga `DB_SYNCHRONIZE=false` (o `NODE_ENV=production`) fuera de desarrollo para evitar cambios automáticos en las tablas.
- **CORS.** `app.enableCors()` permite peticiones desde cualquier origen; restrínjalo antes de un despliegue.
- **Validación de entrada.** El `ValidationPipe` global rechaza propiedades desconocidas y valida tipos, formatos y longitudes.
- **Datos de prueba.** Use solo datos ficticios en Postman y en las pruebas.
- **Mejoras pendientes.** Ya están instaladas, pero no configuradas, las dependencias para autenticación JWT (`@nestjs/jwt`, `@nestjs/passport`), cabeceras de seguridad (`helmet`) y limitación de peticiones (`@nestjs/throttler`).

---

## Trabajo en equipo y Pull Requests

### Responsables por módulo

| Integrante | Responsabilidad |
| --- | --- |
| Edgar | Infraestructura (configuración de base de datos y entorno), Usuarios y Mascotas |
| David | Citas, Historias Clínicas y Alimentación |
| Cristian | Vacunas y Medicamentos |

### Flujo de ramas

- `Main`: rama estable.
- `develop`: rama de integración.
- `feature/<integrante>-<tema>`: una rama por tarea, por ejemplo `feature/cristian-vacunas-medicamentos`.

### Flujo de trabajo recomendado

1. Actualice `develop` y cree su rama `feature/...` a partir de ella.
2. Haga commits pequeños y descriptivos, separando las tareas (por ejemplo, implementación y pruebas en commits distintos).
3. Antes de abrir el Pull Request, ejecute localmente:

   ```bash
   npm run build
   npm run test
   ```

4. Abra un Pull Request hacia `develop` y describa los cambios, cómo probarlos y los resultados obtenidos.
5. Al menos otro integrante revisa el Pull Request antes de fusionarlo.
6. Integre `develop` en `Main` mediante un Pull Request cuando la versión esté probada.

### Convenciones del código

- Mantener la estructura entidad/DTO/controlador/servicio/módulo de cada módulo.
- Validar los cuerpos con `class-validator` y respetar los límites de las columnas.
- Usar `ParseUUIDPipe` en los parámetros `:id`.
- Lanzar `NotFoundException` cuando un registro o su relación no exista.
- Mantener los mensajes de respuesta en español y el formato `{ message, data }`.
- Acompañar cada cambio con pruebas Vitest que no dependan de PostgreSQL.

---

## Recursos

- [Documentación de NestJS](https://docs.nestjs.com)
- [Documentación de TypeORM](https://typeorm.io)
- [Documentación de class-validator](https://github.com/typestack/class-validator)
