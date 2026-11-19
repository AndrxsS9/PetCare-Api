# PetCare API

API REST para la gestión integral del cuidado de mascotas: usuarios, mascotas, citas veterinarias, historias clínicas, planes de alimentación, vacunas y medicamentos.

Está construida con **NestJS** y **TypeScript**, persiste la información en **PostgreSQL** mediante **TypeORM**, protege sus rutas con **autenticación JWT**, aplica **roles y control de propiedad** de los recursos y se documenta con **Swagger (OpenAPI)**.

> **Proyecto académico.** PetCare API se desarrolló como proyecto de curso para practicar el diseño de una API REST por módulos, la persistencia con un ORM, la validación de datos, la autenticación con JWT, la autorización por roles y las pruebas automatizadas (unitarias, HTTP y de extremo a extremo). **No es un sistema listo para producción** ni ofrece garantías completas de seguridad; consulte [Limitaciones conocidas](#limitaciones-conocidas).

---

## Tabla de contenido

1. [Tecnologías](#tecnologías)
2. [Arquitectura y organización de módulos](#arquitectura-y-organización-de-módulos)
3. [Módulos funcionales](#módulos-funcionales)
4. [Autenticación](#autenticación)
5. [Autorización por roles](#autorización-por-roles)
6. [Restricciones de propiedad](#restricciones-de-propiedad)
7. [Documentación Swagger](#documentación-swagger)
8. [Requisitos previos](#requisitos-previos)
9. [Instalación y ejecución en Windows PowerShell](#instalación-y-ejecución-en-windows-powershell)
10. [Variables de entorno](#variables-de-entorno)
11. [Base de datos PostgreSQL](#base-de-datos-postgresql)
12. [Referencia de endpoints](#referencia-de-endpoints)
13. [Ejemplos de peticiones y respuestas](#ejemplos-de-peticiones-y-respuestas)
14. [Códigos de respuesta HTTP](#códigos-de-respuesta-http)
15. [Colección de Postman](#colección-de-postman)
16. [Compilación, pruebas y auditoría](#compilación-pruebas-y-auditoría)
17. [Pruebas e2e con la base de datos `petcare_test`](#pruebas-e2e-con-la-base-de-datos-petcare_test)
18. [Resultados verificados de las pruebas](#resultados-verificados-de-las-pruebas)
19. [Limitaciones conocidas](#limitaciones-conocidas)
20. [Consideraciones de seguridad](#consideraciones-de-seguridad)
21. [Trabajo en equipo y Pull Requests](#trabajo-en-equipo-y-pull-requests)
22. [Recursos](#recursos)

---

## Tecnologías

| Tecnología | Uso en el proyecto |
| --- | --- |
| [NestJS](https://docs.nestjs.com) 12 | Framework del servidor (módulos, controladores, servicios, guards, inyección de dependencias) |
| TypeScript | Lenguaje del proyecto (módulos ES, `"type": "module"`) |
| PostgreSQL | Base de datos relacional |
| TypeORM 1.x + `@nestjs/typeorm` | ORM: entidades, repositorios y relaciones |
| `@nestjs/config` | Carga de variables de entorno desde `.env` |
| `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | Emisión y verificación de tokens JWT (HS256) |
| `bcrypt` | Cifrado de contraseñas |
| `class-validator` / `class-transformer` | Validación de los cuerpos de las peticiones (DTO) |
| `@nestjs/swagger` | Documentación OpenAPI y Swagger UI en `/api/docs` |
| Vitest + Supertest + `@nestjs/testing` | Pruebas unitarias, HTTP y de extremo a extremo (e2e) |

> `package.json` también incluye `helmet` y `@nestjs/throttler`, pero **actualmente no se usan en el código fuente**: la API no envía cabeceras Helmet ni limita la cantidad de peticiones.

---

## Arquitectura y organización de módulos

Cada módulo funcional sigue la misma organización de NestJS:

- **Entidad** (`*.entity.ts`): tabla de PostgreSQL y sus relaciones TypeORM.
- **DTO** (`*.dto.ts`): contrato y reglas de validación de los cuerpos de entrada.
- **Controlador** (`*.controller.ts`): rutas HTTP y documentación Swagger.
- **Servicio** (`*.service.ts`): lógica de negocio, control de propiedad y acceso a datos.
- **Módulo** (`*.module.ts`): registra controlador, servicio y entidades (`TypeOrmModule.forFeature`).
- **Pruebas** (`*.spec.ts`): junto al código que prueban.

```text
src/
├── main.ts                    # Arranque: aplica configureApp y escucha en PORT
├── app.setup.ts               # CORS, ValidationPipe global y Swagger (compartido con las pruebas e2e)
├── app.module.ts              # Módulo raíz: configuración, módulos y guards globales (JWT y roles)
├── app.controller.ts          # GET / (público)
├── config/
│   └── database.config.ts     # Configuración de TypeORM a partir del .env
├── auth/                      # Registro, login, perfil, estrategia JWT, guards, decoradores y reglas de propiedad
│   ├── decorators/            # @Public(), @Roles(), @CurrentUser()
│   ├── guards/                # JwtAuthGuard (401) y RolesGuard (403)
│   ├── strategies/            # JwtStrategy: verifica el token y recarga el usuario
│   └── ownership.ts           # Filtros de propiedad para mascotas y registros asociados
├── swagger/                   # Configuración de Swagger, decoradores y esquemas de respuesta
├── usuarios/
├── mascotas/
├── citas/
├── historias-clinicas/
├── alimentacion/              # Ruta HTTP: /alimentaciones
├── vacunas/
└── medicamentos/
postman/                       # Colección y entorno de Postman
test/                          # Pruebas e2e contra PostgreSQL real (ver test/e2e/README.md)
```

### Guards globales

`app.module.ts` registra dos guards globales, en este orden:

1. **`JwtAuthGuard`**: toda ruta exige un token JWT válido, salvo las marcadas con `@Public()`. Si el token falta, está mal formado, fue alterado o expiró, responde **401**.
2. **`RolesGuard`**: si la ruta declara `@Roles(...)`, el rol del usuario debe estar en la lista; si no, responde **403**.

### Validación global

`app.setup.ts` registra un `ValidationPipe` global con:

- `whitelist: true`: elimina propiedades no declaradas en el DTO.
- `forbidNonWhitelisted: true`: en lugar de eliminarlas, **rechaza con 400** las peticiones que incluyan propiedades desconocidas.
- `transform: true`: convierte el cuerpo en una instancia del DTO.

Por eso, enviar `rol` en el registro público, o intentar cambiar `id` o la mascota asociada en un `PUT`, devuelve `400`.

---

## Módulos funcionales

| Módulo | Ruta base | Descripción |
| --- | --- | --- |
| Usuarios | `/usuarios` | Dueños, veterinarios y administradores. Contraseñas cifradas con bcrypt; el correo es único. |
| Mascotas | `/mascotas` | Mascotas asociadas a un usuario dueño. |
| Citas | `/citas` | Citas veterinarias de una mascota, con estado de la cita. |
| Historias Clínicas | `/historias-clinicas` | Consultas, diagnósticos y peso registrado de una mascota. |
| Alimentación | `/alimentaciones` | Plan de alimentación de una mascota (tipo, marca, cantidad, horario). |
| Vacunas | `/vacunas` | Vacunas aplicadas y fecha de la próxima dosis. |
| Medicamentos | `/medicamentos` | Tratamientos con dosis, frecuencia, fechas de inicio/fin y estado. |

Además:

- `GET /` responde con el texto `PetCare API funcionando!` (público), útil para comprobar que el servidor está en marcha.
- `/auth/register`, `/auth/login` y `/auth/me` gestionan la autenticación (ver [Autenticación](#autenticación)).

En total, la API expone **39 operaciones**: `GET /`, 3 de autenticación y 5 por cada uno de los 7 módulos CRUD.

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

## Autenticación

La API usa **JSON Web Tokens (JWT)** firmados con HS256. El flujo es:

1. **Registro** — `POST /auth/register` (público). Crea un usuario con rol **`DUENO`** y cuenta activa. El cuerpo solo admite `nombre`, `email`, `password` (6 a 72 caracteres) y `telefono`; enviar `rol` o `estado` produce **400**, así que **el registro público nunca puede asignar un rol elevado**.
2. **Inicio de sesión** — `POST /auth/login` (público). Si el correo y la contraseña son correctos y la cuenta está activa, devuelve:

   ```json
   {
     "message": "Inicio de sesión exitoso",
     "data": {
       "accessToken": "<token JWT>",
       "tokenType": "Bearer",
       "usuario": { "id": "…", "nombre": "…", "email": "…", "telefono": "…", "rol": "DUENO", "estado": true }
     }
   }
   ```

   Un correo inexistente, una contraseña incorrecta o una cuenta inactiva producen el mismo **401** `Credenciales inválidas`, para no revelar qué correos están registrados.
3. **Uso del token** — en cada petición protegida se envía la cabecera:

   ```text
   Authorization: Bearer <accessToken>
   ```

4. **Perfil** — `GET /auth/me` devuelve el usuario autenticado (sin contraseña).

Detalles importantes:

- El token contiene `sub` (id del usuario), `email` y `rol`, y caduca según `JWT_EXPIRES_IN` (por defecto, **1 hora**).
- En cada petición, el usuario se **recarga desde la base de datos**: si se desactiva (`estado: false`) o se elimina, su token deja de funcionar de inmediato, y un cambio de rol se aplica sin necesidad de un token nuevo.
- La API **no arranca** si `JWT_SECRET` falta, tiene menos de 32 caracteres o parece un valor de ejemplo.
- Las contraseñas se guardan cifradas con bcrypt y **nunca** se incluyen en las respuestas.

---

## Autorización por roles

Los roles son `ADMIN`, `DUENO` y `VETERINARIO`. Todas las rutas, salvo `GET /`, `POST /auth/register` y `POST /auth/login`, requieren token.

| Operación | ADMIN | VETERINARIO | DUENO |
| --- | --- | --- | --- |
| `GET /auth/me` | ✅ | ✅ | ✅ |
| `GET /usuarios` (listar) | ✅ | ✅ | ❌ 403 |
| `GET /usuarios/:id` | ✅ cualquiera | ✅ cualquiera | Solo a sí mismo (otro: 403) |
| `POST /usuarios` (crear con cualquier rol) | ✅ | ❌ 403 | ❌ 403 |
| `PUT /usuarios/:id` | ✅ cualquiera, incluidos `rol` y `estado` | Solo a sí mismo, sin `rol` ni `estado` (403) | Solo a sí mismo, sin `rol` ni `estado` (403) |
| `DELETE /usuarios/:id` | ✅ | ❌ 403 | ❌ 403 |
| Mascotas (5 operaciones) | ✅ todas | Solo las propias | Solo las propias |
| Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos | ✅ todos | Solo los de sus mascotas | Solo los de sus mascotas |

> **Cómo obtener un ADMIN en desarrollo.** No existe un usuario administrador inicial y el registro público siempre crea `DUENO`. Para pruebas locales, registre un usuario ficticio y promuévalo manualmente **en su base de datos de desarrollo** (nunca en datos reales):
>
> ```powershell
> psql -U postgres -h localhost -d petcare_db -c "UPDATE usuarios SET rol = 'ADMIN' WHERE email = 'admin.prueba@example.com';"
> ```
>
> Como el usuario se recarga en cada petición, el nuevo rol se aplica de inmediato. En Postman, vuelva a ejecutar **Iniciar sesión** o **Perfil del usuario autenticado** para actualizar la variable `usuarioRol`.

---

## Restricciones de propiedad

Además del rol, los servicios aplican un control de **propiedad de los recursos** (`src/auth/ownership.ts`):

- **ADMIN**: sin restricciones.
- **DUENO y VETERINARIO**: solo acceden a las mascotas cuyo `usuarioId` es su propio id, y solo a los registros (citas, historias clínicas, alimentación, vacunas y medicamentos) de esas mascotas.
- La identidad se toma **siempre del token verificado**, nunca del cuerpo de la petición.
- Los registros de otro usuario se responden con **404**, exactamente igual que si no existieran, para no revelar su existencia.
- Los listados (`GET /mascotas`, `GET /citas`, etc.) se filtran en la propia consulta SQL: cada usuario solo ve lo suyo.

Reglas concretas:

| Caso | Resultado |
| --- | --- |
| `POST /mascotas` sin `usuarioId` | La mascota se asigna al usuario autenticado. |
| `POST /mascotas` con un `usuarioId` distinto del propio (no ADMIN) | **403** `Solo puedes registrar mascotas a tu nombre`. |
| `POST /mascotas` con `usuarioId` de otro usuario (ADMIN) | Permitido si el usuario existe (404 si no existe). |
| `PUT /mascotas/:id` cambiando `usuarioId` (no ADMIN) | **403**: solo ADMIN puede transferir una mascota. |
| Crear un registro con la mascota de otro usuario | **404** `Mascota con ID … no encontrada`; no se crea nada. |
| Consultar, modificar o eliminar una mascota o registro ajeno | **404**; los datos no cambian. |

---

## Documentación Swagger

Con la API en ejecución, abra:

- **Swagger UI**: <http://localhost:3000/api/docs>
- **Documento OpenAPI (JSON)**: <http://localhost:3000/api/docs-json>

Para probar rutas protegidas desde Swagger:

1. Ejecute `POST /auth/login` y copie el valor de `data.accessToken`.
2. Pulse **Authorize** y pegue el token **sin** el prefijo `Bearer`.
3. Ejecute las demás operaciones. El token se guarda solo en memoria: al recargar la página hay que volver a autorizarse.

Swagger está **habilitado por defecto fuera de producción** y **deshabilitado con `NODE_ENV=production`**. `SWAGGER_ENABLED=true` o `SWAGGER_ENABLED=false` fuerzan el valor. Swagger solo documenta: no cambia la autenticación ni los permisos.

---

## Requisitos previos

- **Node.js**: 20.19 o superior en la rama 20, 22.13 o superior en la rama 22, o 24.11 o superior (requisitos de NestJS 12 y TypeORM 1.x).
- **npm** (incluido con Node.js).
- **PostgreSQL** en ejecución, con un usuario que pueda crear tablas en la base de datos del proyecto, y `psql` en el `PATH` para los comandos de este documento.
- Opcional: **Postman** para probar la API manualmente.

---

## Instalación y ejecución en Windows PowerShell

Ejecute los comandos desde la carpeta raíz del proyecto.

1. **Clonar e instalar dependencias**

   ```powershell
   git clone https://github.com/AndrxsS9/PetCare-Api.git
   cd PetCare-Api
   npm ci
   ```

   `npm ci` instala exactamente las versiones fijadas en `package-lock.json`. Use `npm install` solo cuando necesite agregar o actualizar dependencias.

2. **Crear la base de datos de desarrollo** (una sola vez, ver [Base de datos PostgreSQL](#base-de-datos-postgresql)):

   ```powershell
   psql -U postgres -h localhost -c "CREATE DATABASE petcare_db;"
   'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' | psql -U postgres -h localhost -d petcare_db
   ```

3. **Crear el archivo `.env`** a partir de la plantilla y editarlo:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

4. **Generar un secreto JWT** y pegarlo en `JWT_SECRET` dentro de `.env`:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

5. **Iniciar la API en modo desarrollo**:

   ```powershell
   npm run start:dev
   ```

6. **Comprobar que funciona**: abra <http://localhost:3000> (debe mostrar `PetCare API funcionando!`) y <http://localhost:3000/api/docs>.

Otros comandos de ejecución:

| Comando | Descripción |
| --- | --- |
| `npm run start:dev` | Inicia la API en modo desarrollo con recarga automática. |
| `npm run start` | Inicia la API sin recarga automática. |
| `npm run build` | Compila el proyecto a `dist/` (excluye los archivos `*.spec.ts`). |
| `npm run start:prod` | Ejecuta la versión compilada (`node dist/main`); requiere `npm run build` previo. |
| `npm run lint` | Analiza el código con oxlint. |

---

## Variables de entorno

El archivo `.env` está en `.gitignore`: **no lo suba al repositorio ni comparta sus valores**. Use `.env.example` como plantilla, que solo contiene valores de muestra.

| Variable | Valor por defecto en el código | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP de la API. |
| `NODE_ENV` | — | Con `production`, `synchronize` se fuerza a `false` y Swagger se desactiva (salvo `SWAGGER_ENABLED=true`). |
| `DB_HOST` | `localhost` | Servidor de PostgreSQL. |
| `DB_PORT` | `5432` | Puerto de PostgreSQL. |
| `DB_USERNAME` | `postgres` | Usuario de la base de datos. |
| `DB_PASSWORD` | `postgres` | Contraseña de la base de datos. **Defina siempre la suya.** |
| `DB_NAME` | `petcare_db` | Nombre de la base de datos. |
| `DB_SYNCHRONIZE` | `true` | Sincroniza automáticamente el esquema con las entidades (ver advertencia). |
| `DB_LOGGING` | `false` | Muestra en consola las consultas SQL. |
| `DB_SSL` | `false` | Con `true`, conecta por SSL (`rejectUnauthorized: false`). |
| `JWT_SECRET` | — (**obligatoria**) | Secreto para firmar los tokens. Mínimo 32 caracteres, aleatorio y sin apariencia de valor de ejemplo; si no, la API no arranca. |
| `JWT_EXPIRES_IN` | `3600` | Duración del token en segundos (entre 60 y 86400). |
| `SWAGGER_ENABLED` | — | `true` o `false` fuerzan Swagger; si se omite, depende de `NODE_ENV`. |

Ejemplo (solo valores de muestra; **no copie secretos reales en la documentación**):

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

# Genere un valor aleatorio propio (ver paso 4 de la instalación)
JWT_SECRET=
JWT_EXPIRES_IN=3600

# SWAGGER_ENABLED=
```

> ⚠️ **Sincronización de esquema.** Con `DB_SYNCHRONIZE=true`, TypeORM crea y **modifica** las tablas al arrancar para que coincidan con las entidades. Puede eliminar o alterar columnas y datos si una entidad cambia. Está pensada **solo para desarrollo**: no la active en bases de datos con información importante.

---

## Base de datos PostgreSQL

1. Cree la base de datos de desarrollo:

   ```powershell
   psql -U postgres -h localhost -c "CREATE DATABASE petcare_db;"
   ```

2. Las claves primarias son UUID generados con la extensión `uuid-ossp`. TypeORM intenta crearla al conectarse; si el usuario configurado no tiene permisos suficientes, créela una vez como superusuario:

   ```powershell
   'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' | psql -U postgres -h localhost -d petcare_db
   ```

   (El SQL se envía por la entrada estándar porque Windows PowerShell 5.1 elimina las comillas dobles internas de los argumentos de programas nativos.)

3. Con `DB_SYNCHRONIZE=true`, al iniciar la aplicación TypeORM crea las tablas `usuarios`, `mascotas`, `citas`, `historias_clinicas`, `alimentaciones`, `vacunas` y `medicamentos`. El proyecto no incluye migraciones ni datos de ejemplo.

> La base de datos de las pruebas e2e (`petcare_test`) es **otra base de datos, separada y desechable**. No use `petcare_db` para las pruebas e2e. Ver [Pruebas e2e](#pruebas-e2e-con-la-base-de-datos-petcare_test).

---

## Referencia de endpoints

Formato general de las respuestas:

```jsonc
// GET de colección → arreglo de registros (sin envoltorio)
[{ "id": "…", "...": "..." }]

// GET /:id, POST y PUT → { message, data }
{ "message": "Vacuna encontrada", "data": { "id": "…", "...": "..." } }

// DELETE → { message }
{ "message": "Vacuna eliminada con éxito" }
```

### Públicos y autenticación

| Método | Ruta | Acceso | Descripción | Éxito | Errores |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/` | Público | Estado de la API (texto plano). | `200` | — |
| `POST` | `/auth/register` | Público | Registra un usuario `DUENO`. | `201` | `400`, `409` |
| `POST` | `/auth/login` | Público | Devuelve `accessToken`, `tokenType` y `usuario`. | `200` | `400`, `401` |
| `GET` | `/auth/me` | Token | Perfil del usuario autenticado. | `200` | `401` |

### Usuarios — `/usuarios` (requiere token)

| Método | Ruta | Acceso | Descripción | Errores |
| --- | --- | --- | --- | --- |
| `GET` | `/usuarios` | ADMIN, VETERINARIO | Lista los usuarios (sin contraseñas). | `401`, `403` |
| `GET` | `/usuarios/:id` | ADMIN, VETERINARIO o el propio usuario | Usuario con sus mascotas (sin contraseña). | `401`, `403`, `404` |
| `POST` | `/usuarios` | Solo ADMIN | Crea un usuario con cualquier rol. | `400`, `401`, `403`, `409` |
| `PUT` | `/usuarios/:id` | ADMIN, o el propio usuario sin `rol`/`estado` | Actualiza datos; si incluye `password`, se vuelve a cifrar. | `400`, `401`, `403`, `404`, `409` |
| `DELETE` | `/usuarios/:id` | Solo ADMIN | Elimina el usuario **y en cascada sus mascotas y registros**. | `401`, `403`, `404` |

> En Usuarios el `:id` de la ruta **no** se valida como UUID. Un valor mal formado no devuelve `400`: un DUENO recibe `403` (no es su id) y un ADMIN o VETERINARIO puede recibir `500` por el error de base de datos.

### Mascotas — `/mascotas` (requiere token)

| Método | Ruta | Descripción | Errores |
| --- | --- | --- | --- |
| `GET` | `/mascotas` | Mascotas accesibles con su dueño (sin contraseña). | `401` |
| `GET` | `/mascotas/:id` | Mascota con su dueño. | `400`, `401`, `404` |
| `POST` | `/mascotas` | Registra una mascota; `usuarioId` es opcional (por defecto, el usuario autenticado). | `400`, `401`, `403`, `404` |
| `PUT` | `/mascotas/:id` | Actualización parcial; solo ADMIN puede cambiar `usuarioId`. | `400`, `401`, `403`, `404` |
| `DELETE` | `/mascotas/:id` | Elimina la mascota **y en cascada sus registros**. | `400`, `401`, `404` |

### Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos (requieren token)

Cada módulo expone `GET /<recurso>`, `GET /<recurso>/:id`, `POST /<recurso>`, `PUT /<recurso>/:id` y `DELETE /<recurso>/:id`.

| Módulo | Rutas | Campo de la mascota |
| --- | --- | --- |
| Citas | `/citas`, `/citas/:id` | `mascotaId` |
| Historias Clínicas | `/historias-clinicas`, `/historias-clinicas/:id` | `mascotaId` |
| Alimentación | `/alimentaciones`, `/alimentaciones/:id` | `mascotaId` |
| Vacunas | `/vacunas`, `/vacunas/:id` | **`mascota_id`** (con guion bajo) |
| Medicamentos | `/medicamentos`, `/medicamentos/:id` | `mascotaId` |

En estos cinco módulos (y en Mascotas):

- El `:id` se valida con `ParseUUIDPipe`: un UUID mal formado devuelve **`400`** sin consultar la base de datos.
- `POST` verifica que la mascota exista **y pertenezca al usuario** (ADMIN: cualquiera); si no, **`404`**.
- `PUT` no permite cambiar `id` ni la mascota asociada (**`400`** si se envían).
- `GET`, `PUT` y `DELETE` devuelven **`404`** si el registro no existe o pertenece a una mascota ajena.

---

## Ejemplos de peticiones y respuestas

Todos los valores son **datos ficticios**. Sustituya los UUID por los identificadores reales que devuelva la API y `<token JWT>` por el token obtenido al iniciar sesión.

Las fechas usan formato ISO 8601:

- Las columnas de tipo `date` (fecha de nacimiento, vacunas, medicamentos) usan `YYYY-MM-DD`.
- `fechaHora` (citas) y `fechaConsulta` (historias clínicas) admiten fecha y hora, por ejemplo `2026-12-01T10:00:00.000Z`.

### Registro — `POST /auth/register`

```json
{
  "nombre": "María Pérez",
  "email": "maria.perez@example.com",
  "password": "CambiaEsta123",
  "telefono": "3001234567"
}
```

Respuesta `201`:

```json
{
  "message": "Usuario registrado con éxito",
  "data": {
    "id": "6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
    "nombre": "María Pérez",
    "email": "maria.perez@example.com",
    "telefono": "3001234567",
    "rol": "DUENO",
    "estado": true
  }
}
```

| Campo | Reglas |
| --- | --- |
| `nombre` | Texto obligatorio, máximo 100 caracteres. |
| `email` | Correo válido, obligatorio y único, máximo 150 caracteres (409 si ya existe). |
| `password` | Texto obligatorio, de 6 a 72 caracteres. Nunca se devuelve. |
| `telefono` | Texto obligatorio, máximo 20 caracteres. |
| `rol`, `estado` | **No permitidos** (400). El rol siempre es `DUENO`. |

### Inicio de sesión — `POST /auth/login`

```json
{
  "email": "maria.perez@example.com",
  "password": "CambiaEsta123"
}
```

Respuesta `200`:

```json
{
  "message": "Inicio de sesión exitoso",
  "data": {
    "accessToken": "<token JWT>",
    "tokenType": "Bearer",
    "usuario": {
      "id": "6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
      "nombre": "María Pérez",
      "email": "maria.perez@example.com",
      "telefono": "3001234567",
      "rol": "DUENO",
      "estado": true
    }
  }
}
```

### Perfil — `GET /auth/me`

```text
Authorization: Bearer <token JWT>
```

Respuesta `200`: `{ "message": "Perfil del usuario autenticado", "data": { ...usuario sin contraseña } }`.

### Ejemplo completo en PowerShell

```powershell
$base = 'http://localhost:3000'
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' `
  -Body '{"email":"maria.perez@example.com","password":"CambiaEsta123"}'
$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }

Invoke-RestMethod -Uri "$base/auth/me" -Headers $headers
Invoke-RestMethod -Uri "$base/mascotas" -Headers $headers
```

### Usuarios (solo ADMIN para crear)

`POST /usuarios`

```json
{
  "nombre": "Laura Gómez",
  "email": "laura.gomez@example.com",
  "password": "CambiaEsta123",
  "telefono": "3109876543",
  "rol": "VETERINARIO",
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

`PUT /usuarios/:id` (todos los campos son opcionales; `rol` y `estado` solo para ADMIN):

```json
{
  "telefono": "3001112233"
}
```

### Mascotas

`POST /mascotas` — un usuario normal **omite `usuarioId`** y la mascota queda a su nombre:

```json
{
  "nombre": "Firulais",
  "especie": "PERRO",
  "raza": "Criollo",
  "fecha_nacimiento": "2022-03-15",
  "peso": 12.5,
  "fotoUrl": "https://example.com/fotos/firulais.jpg",
  "estado": true
}
```

Respuesta `201` (resumida):

```json
{
  "message": "Mascota creada con éxito",
  "data": {
    "id": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
    "usuarioId": "6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
    "nombre": "Firulais",
    "especie": "PERRO",
    "raza": "Criollo",
    "peso": 12.5,
    "estado": true,
    "usuario": { "id": "6f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f", "nombre": "María Pérez", "rol": "DUENO", "...": "sin contraseña" }
  }
}
```

| Campo | Reglas |
| --- | --- |
| `usuarioId` | UUID **opcional**. Si se omite, se usa el usuario autenticado. Solo ADMIN puede indicar otro usuario (403 para los demás; 404 si no existe). |
| `nombre`, `raza` | Texto obligatorio (columnas de 100 caracteres). |
| `especie` | Obligatorio: `PERRO`, `GATO`, `AVE` u `OTRO`. |
| `fecha_nacimiento` | Fecha ISO obligatoria (`YYYY-MM-DD`). |
| `peso` | Número positivo obligatorio. |
| `fotoUrl` | Texto opcional (columna de 255 caracteres); por defecto `""`. |
| `estado` | Booleano opcional; por defecto `true`. |

`PUT /mascotas/:id` (todos opcionales; `usuarioId` solo para ADMIN, para transferir la mascota):

```json
{
  "peso": 13.2
}
```

### Citas

`POST /citas`

```json
{
  "mascotaId": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  "fechaHora": "2026-12-01T10:00:00.000Z",
  "motivo": "Control anual",
  "lugarveterinaria": "Clínica Veterinaria Central",
  "estado": "PROGRAMADA"
}
```

Respuesta `201`:

```json
{
  "message": "Cita creada con éxito",
  "data": {
    "id": "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    "mascotaId": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
    "fechaHora": "2026-12-01T10:00:00.000Z",
    "motivo": "Control anual",
    "lugarveterinaria": "Clínica Veterinaria Central",
    "estado": "PROGRAMADA"
  }
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota propia (ADMIN: cualquiera). |
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
  "mascotaId": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  "fechaConsulta": "2026-11-18T10:00:00.000Z",
  "diagnostico": "Control general sin hallazgos",
  "observaciones": "Registro de prueba",
  "pesoRegistrado": 12.4,
  "veterinarioResponsable": "Dra. Laura Gómez"
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota propia (ADMIN: cualquiera). |
| `fechaConsulta` | Fecha ISO 8601 obligatoria. |
| `diagnostico` | Texto obligatorio, no vacío. |
| `observaciones` | Texto opcional. |
| `pesoRegistrado` | Número positivo obligatorio. |
| `veterinarioResponsable` | Texto obligatorio, no vacío, máximo 150 caracteres (texto libre, no se vincula a un usuario). |

`PUT /historias-clinicas/:id` (todos opcionales; no se puede cambiar `mascotaId`):

```json
{
  "diagnostico": "Control general, seguimiento en 6 meses"
}
```

### Alimentación

`POST /alimentaciones`

```json
{
  "mascotaId": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  "tipoAlimento": "Concentrado",
  "marca": "Marca Ejemplo",
  "cantidad": 250,
  "unidad": "gramos",
  "frecuencia": "2 veces al día",
  "horario": "08:00 y 18:00",
  "observaciones": "Registro de prueba"
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota propia (ADMIN: cualquiera). |
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

`POST /vacunas`. **Atención:** la mascota se indica con `mascota_id`, con guion bajo. Enviar `mascotaId` produce 400.

```json
{
  "mascota_id": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  "nombreVacuna": "Antirrábica",
  "fechaAplicacion": "2026-01-10",
  "loteVacuna": "LOTE-PRUEBA-001",
  "observaciones": "Registro de prueba",
  "proximaDosis": "2027-01-10"
}
```

| Campo | Reglas |
| --- | --- |
| `mascota_id` | UUID obligatorio de una mascota propia (ADMIN: cualquiera). |
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
  "mascotaId": "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  "nombreMedicamento": "Amoxicilina",
  "dosis": "250 mg",
  "frecuencia": "Cada 12 horas",
  "inicio": "2026-06-10",
  "fin": "2026-06-17",
  "observaciones": "Administrar con comida",
  "estado": true
}
```

| Campo | Reglas |
| --- | --- |
| `mascotaId` | UUID obligatorio de una mascota propia (ADMIN: cualquiera). |
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
| `200 OK` | `GET`, `PUT`, `DELETE` y `POST /auth/login` exitosos. |
| `201 Created` | `POST` de creación exitoso (incluido `POST /auth/register`). |
| `400 Bad Request` | Cuerpo inválido (campo obligatorio ausente, tipo o formato incorrecto, valor fuera de límites, fecha inválida, enumeración no válida), propiedad no permitida (por ejemplo `rol` en el registro) o `:id` mal formado en Mascotas, Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos. |
| `401 Unauthorized` | Token ausente, mal formado, alterado o expirado (`Token de acceso inválido, expirado o ausente`), o credenciales incorrectas en el login (`Credenciales inválidas`). |
| `403 Forbidden` | El rol no tiene permiso (`No tienes permisos para realizar esta acción`), un usuario no ADMIN intenta consultar o modificar a otro usuario, cambiar `rol`/`estado`, registrar una mascota a nombre de otro o transferirla. |
| `404 Not Found` | El registro no existe **o pertenece a otro usuario**, o no existe el usuario/mascota asociado. |
| `409 Conflict` | El correo electrónico ya está registrado. |
| `500 Internal Server Error` | Errores no controlados; por ejemplo, un `:id` que no es UUID en Usuarios (para ADMIN o VETERINARIO) o un texto más largo que su columna en Usuarios o Mascotas. |

Ejemplos de cuerpos de error:

```json
{
  "message": "Token de acceso inválido, expirado o ausente",
  "error": "Unauthorized",
  "statusCode": 401
}
```

```json
{
  "message": "No tienes permisos para realizar esta acción",
  "error": "Forbidden",
  "statusCode": 403
}
```

```json
{
  "message": ["property rol should not exist"],
  "error": "Bad Request",
  "statusCode": 400
}
```

```json
{
  "message": "Mascota con ID 3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b no encontrada",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Colección de Postman

Archivos incluidos en la carpeta `postman/`:

- `PetCare-API.postman_collection.json`: colección (formato **v2.1**) con las 39 operaciones, organizada por carpetas: Estado de la API, Autenticación, los 7 módulos y **Casos de error**.
- `PetCare-Local.postman_environment.json`: entorno **PetCare Local** con `baseUrl = http://localhost:3000` y `accessToken` vacío.

### Importar y usar paso a paso

1. En Postman: **Import** → seleccione los dos archivos de `postman/`.
2. Seleccione el entorno **PetCare Local** en la esquina superior derecha (necesario para guardar el token en el entorno).
3. Inicie la API: `npm run start:dev`.
4. **Autenticación → Registrar usuario (público)**: crea un usuario ficticio `DUENO`. El script previo genera un correo único (`usuario.prueba.<marca de tiempo>@example.com`) y lo guarda en `usuarioEmail`.
5. **Autenticación → Iniciar sesión (público, guarda el token)**: el JWT se guarda automáticamente.
6. **Autenticación → Perfil del usuario autenticado**: `GET /auth/me` con el token.
7. **Mascotas → Crear mascota**: crea su propia mascota (sin `usuarioId`) y guarda `mascotaId`.
8. Pruebe las operaciones CRUD autorizadas: crear, listar, consultar y actualizar en Mascotas, Citas, Historias Clínicas, Alimentación, Vacunas y Medicamentos.

Con el **Collection Runner** puede ejecutar la colección completa en ese orden. Los `DELETE` se omiten mientras `permitirEliminacion` sea `false`.

### Cómo funciona la autenticación JWT automática

- La **colección** tiene autorización **Bearer Token** con el valor `{{accessToken}}`. Todas las carpetas y peticiones protegidas la **heredan** (*Inherit auth from parent*), así que envían `Authorization: Bearer {{accessToken}}`.
- Las peticiones **públicas** (`GET /`, `POST /auth/register`, `POST /auth/login`) tienen **No Auth** para no enviar el token.
- El script de pruebas de **Iniciar sesión** lee `response.data.accessToken` y lo guarda con `pm.environment.set('accessToken', …)` en el **entorno activo**. Si no hay un entorno seleccionado, lo guarda como variable de la colección y muestra un aviso en la consola. El token nunca se imprime.
- El mismo script guarda `usuarioId` y `usuarioRol` (del objeto `data.usuario`). Si inicia sesión con un usuario distinto, limpia los ids de mascotas y registros del usuario anterior.
- Si una petición devuelve **401**, la consola de Postman indica que debe volver a iniciar sesión (el token caduca, por defecto, en 1 hora).
- No hay ningún JWT, contraseña real ni secreto en los archivos exportados. **No exporte el entorno después de iniciar sesión** sin vaciar antes `accessToken`.

### Variables

| Variable | Ámbito | Uso |
| --- | --- | --- |
| `baseUrl` | Entorno y colección | URL de la API (`http://localhost:3000`). |
| `accessToken` | Entorno | JWT guardado por **Iniciar sesión**. Vacío en el archivo. |
| `usuarioEmail` | Colección | Correo ficticio generado al registrar; lo usa el inicio de sesión. Para usar una cuenta existente (por ejemplo, un ADMIN de desarrollo), escríbalo antes de iniciar sesión. |
| `usuarioPassword` | Colección | Contraseña **ficticia** de muestra (`CambiarEsta123`). No use contraseñas reales. |
| `usuarioId`, `usuarioRol` | Colección | Usuario autenticado; se rellenan al iniciar sesión. |
| `usuarioCreadoId` | Colección | Usuario creado por un ADMIN con **Crear usuario [SOLO ADMIN]**. |
| `mascotaId`, `citaId`, `historiaClinicaId`, `alimentacionId`, `vacunaId`, `medicamentoId` | Colección | Se rellenan automáticamente con los scripts de cada `POST`. |
| `permitirEliminacion` | Colección | `false` por defecto. Las peticiones `DELETE` se omiten mientras no la cambie a `true`. |

### Peticiones restringidas por rol

- **Usuarios** contiene peticiones marcadas **[SOLO ADMIN]** (crear y eliminar) y **[ADMIN o VETERINARIO]** (listar). Sus pruebas leen `usuarioRol`: con un `DUENO` esperan **403**, que es la respuesta correcta. Para probarlas como ADMIN, promueva un usuario de desarrollo (ver [Autorización por roles](#autorización-por-roles)), escriba su correo y contraseña en `usuarioEmail` y `usuarioPassword` e inicie sesión.
- **Obtener usuario por ID (propio)** y **Actualizar usuario (propio)** trabajan sobre el usuario autenticado y funcionan con cualquier rol. Los usuarios no ADMIN no pueden enviar `rol` ni `estado`.

### Casos de error

La carpeta **Casos de error (no modifican datos)** demuestra los códigos reales de la API sin crear ni modificar nada: perfil sin token (401), registro con `rol: "ADMIN"` (400), contraseña incorrecta (401), `:id` mal formado (400), mascota inexistente (404), mascota a nombre de otro usuario (403 para no ADMIN) y vacuna con `mascotaId` en lugar de `mascota_id` (400).

### Eliminación (peticiones destructivas)

Los `DELETE` están marcados como **[DESTRUCTIVO]** y su script previo los omite mientras `permitirEliminacion` sea `false`. Para eliminar **solo los registros de prueba**:

1. Cambie `permitirEliminacion` a `true`.
2. Ejecute **manualmente** los `DELETE`, empezando por los registros dependientes (medicamentos, vacunas, alimentación, historias clínicas, citas) y luego la mascota.
3. Vuelva a poner `permitirEliminacion` en `false`.

> ⚠️ **Eliminar una mascota borra en cascada sus citas, historias clínicas, alimentación, vacunas y medicamentos. Eliminar un usuario borra en cascada sus mascotas y todos esos registros.** El `DELETE` de usuarios es solo para ADMIN y apunta a `usuarioCreadoId` (el usuario de prueba que creó el ADMIN), nunca al usuario autenticado.

> Use la colección contra una base de datos de desarrollo, con datos ficticios. No la ejecute contra datos reales.

---

## Compilación, pruebas y auditoría

| Comando | Descripción | ¿Necesita PostgreSQL? |
| --- | --- | --- |
| `npm run build` | Compila el proyecto TypeScript a `dist/`. | No |
| `npm run test` | Pruebas unitarias y HTTP (`src/**/*.spec.ts`) con Vitest. | No |
| `npm run test:e2e` | Pruebas de extremo a extremo contra la base de datos aislada `petcare_test`. | **Sí** |
| `npm audit --omit=dev` | Revisa vulnerabilidades conocidas en las dependencias de producción. | No |
| `npm run test:watch` | Pruebas en modo observación. | No |
| `npm run test:cov` | Pruebas con informe de cobertura. | No |

En Windows PowerShell:

```powershell
npm run build
npm run test
npm audit --omit=dev
npm run test:e2e   # solo con petcare_test configurada (ver la sección siguiente)
```

`npm run test` ejecuta:

- **Pruebas de servicios**: con repositorios TypeORM simulados (*mocks*).
- **Pruebas de DTO**: reglas de validación.
- **Pruebas HTTP de controladores**: levantan la aplicación con Supertest y el mismo `ValidationPipe`, con servicios simulados.
- **Pruebas de autenticación, roles y propiedad**: JWT, guards, configuración del secreto y filtros de propiedad.
- **Pruebas de Swagger**: el documento OpenAPI coincide con las rutas, la seguridad y los mensajes reales.

Estas pruebas **no necesitan PostgreSQL**.

---

## Pruebas e2e con la base de datos `petcare_test`

`npm run test:e2e` arranca el `AppModule` real (JWT, roles, propiedad, validación, TypeORM y Swagger) y envía peticiones HTTP reales contra una **base de datos PostgreSQL dedicada y desechable llamada `petcare_test`**. La guía completa, que es la fuente de referencia, está en [test/e2e/README.md](test/e2e/README.md).

### Garantías de seguridad

Antes de abrir cualquier conexión, la suite comprueba que:

- la configuración proviene solo de variables `E2E_*` (archivo `.env.e2e` o variables del proceso) y **nunca** de `.env`;
- `E2E_DB_NAME` es `petcare_test` (o `petcare_test_<sufijo>`), se repite en `E2E_DB_CONFIRM` y es distinto de `DB_NAME` en `.env`;
- el servidor es local, salvo `E2E_ALLOW_REMOTE_DB=true`, y `NODE_ENV` no es `production`;
- una conexión de solo lectura confirma `current_database()` antes de arrancar la aplicación.

Si alguna comprobación falla, la ejecución se detiene sin tocar nada. La suite **nunca** crea ni elimina bases de datos ni vacía tablas: crea usuarios con correos `e2e-<runId>-…@petcare-e2e.test` y, al terminar, elimina solo esos usuarios (sus mascotas y registros se borran en cascada).

### Preparación (una sola vez, Windows PowerShell)

1. Crear la base de datos de pruebas y la extensión:

   ```powershell
   psql -U postgres -h localhost -c "CREATE DATABASE petcare_test;"
   'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' | psql -U postgres -h localhost -d petcare_test
   ```

2. Crear la configuración privada (está en `.gitignore`):

   ```powershell
   Copy-Item .env.e2e.example .env.e2e
   notepad .env.e2e
   ```

   Complete `E2E_DB_USERNAME` y `E2E_DB_PASSWORD`, ponga `E2E_DB_CONFIRM=petcare_test` y pegue en `E2E_JWT_SECRET` un secreto generado con:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Ejecutar:

   ```powershell
   npm run test:e2e
   ```

Si una ejecución se interrumpe antes de limpiar, consulte en [test/e2e/README.md](test/e2e/README.md) cómo eliminar los datos sobrantes **solo de la base de datos de pruebas**.

---

## Resultados verificados de las pruebas

Resultados obtenidos el **19 de noviembre de 2026** en la rama `feature/auth-swagger-e2e`, en Windows con Node.js 24:

| Verificación | Resultado |
| --- | --- |
| `npm run build` | ✅ Compilación sin errores |
| `npm run test` | ✅ **1129 pruebas** aprobadas en 32 archivos |
| `npm run test:e2e` | ✅ **54 pruebas** aprobadas contra PostgreSQL real (`petcare_test`) |
| **Total** | ✅ **1183 pruebas** aprobadas |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades en dependencias de producción |
| Colección y entorno de Postman | ✅ JSON válido; las 39 operaciones corresponden a rutas reales |

> En Windows, ejecute Vitest desde la ruta del proyecto tal como la muestra el explorador o VS Code. Si la terminal usa una letra de unidad con distinta mayúscula/minúscula (por ejemplo `C:` frente a `c:`, algo habitual en Git Bash), Vitest puede cargar dos copias de sí mismo y fallar con `Cannot read properties of undefined (reading 'config')`. PowerShell no presenta este problema.

---

## Limitaciones conocidas

Estas limitaciones se identificaron en el código actual y se documentan para que el alcance del proyecto quede claro:

- **Sin asignación de veterinarios a mascotas.** No existe un modelo que vincule un `VETERINARIO` con las mascotas que atiende: para mascotas y registros tiene exactamente los mismos permisos que un `DUENO` (solo las suyas). Sí puede listar y consultar cualquier usuario, y `GET /usuarios/:id` incluye el resumen de las mascotas de ese usuario, aunque no pueda abrirlas en `/mascotas/:id`. El campo `veterinarioResponsable` de las historias clínicas es texto libre.
- **Sin limitación de peticiones en la autenticación.** `@nestjs/throttler` está instalado pero no configurado: `POST /auth/login` y `POST /auth/register` no limitan los intentos, por lo que no hay protección contra ataques de fuerza bruta.
- **Sin cabeceras de seguridad HTTP.** `helmet` está instalado pero no se usa.
- **Tokens sin revocación ni renovación.** No hay *refresh tokens* ni cierre de sesión en el servidor: un token sigue siendo válido hasta que caduca, salvo que el usuario se desactive o se elimine.
- **Sin administrador inicial.** No hay datos semilla: el primer `ADMIN` debe promoverse manualmente en la base de datos de desarrollo. Tampoco hay protección para que un ADMIN se elimine o se desactive a sí mismo, ni para conservar al menos un ADMIN.
- **Validación incompleta en Usuarios y Mascotas.** El `:id` de `/usuarios/:id` no se valida como UUID (puede producir `500`). `POST /usuarios`, `PUT /usuarios/:id` y Mascotas no limitan la longitud de los textos en el DTO: un valor más largo que la columna produce un error de base de datos (`500`) en lugar de `400`. Además, esas rutas de Usuarios no limitan la contraseña a 72 caracteres como el registro público, y bcrypt solo usa los primeros 72 bytes.
- **Correos sensibles a mayúsculas.** El correo no se normaliza: `Maria@example.com` y `maria@example.com` se consideran distintos al registrarse y al iniciar sesión.
- **Sin reglas de negocio entre fechas.** No se valida, por ejemplo, que `fin` sea posterior a `inicio` en Medicamentos, que `proximaDosis` sea posterior a `fechaAplicacion` en Vacunas, ni que una cita sea futura o no se superponga con otra.
- **Sin paginación ni filtros.** Los listados devuelven todos los registros accesibles.
- **CORS abierto.** `app.enableCors()` permite peticiones desde cualquier origen.
- **Esquema sin migraciones.** El esquema depende de `DB_SYNCHRONIZE`; no hay migraciones versionadas.
- **SSL sin verificación de certificado.** Con `DB_SSL=true`, la conexión usa `rejectUnauthorized: false`.

---

## Consideraciones de seguridad

- **Alcance académico.** La API implementa autenticación, roles y control de propiedad, pero **no está preparada para producción**; revise las [limitaciones](#limitaciones-conocidas) antes de exponerla fuera de un entorno local.
- **Secretos.** `.env` y `.env.e2e` están en `.gitignore`. No suba credenciales ni secretos reales y use valores distintos en cada entorno. Genere `JWT_SECRET` con el comando indicado; la API rechaza secretos cortos o de ejemplo.
- **Contraseñas.** Se almacenan cifradas con bcrypt y no aparecen en ninguna respuesta (usuarios, perfil, login ni el dueño incluido en cada mascota).
- **Tokens.** Trate el `accessToken` como una contraseña temporal: no lo pegue en archivos del repositorio ni exporte entornos de Postman con el token guardado.
- **Sincronización de esquema.** Mantenga `DB_SYNCHRONIZE=false` (o `NODE_ENV=production`) fuera de desarrollo.
- **Swagger.** Está habilitado por defecto fuera de producción; desactívelo con `SWAGGER_ENABLED=false` si la API es accesible desde otras máquinas.
- **Validación de entrada.** El `ValidationPipe` global rechaza propiedades desconocidas y valida tipos, formatos y longitudes declaradas.
- **Datos de prueba.** Use solo datos ficticios en Postman, Swagger y las pruebas.

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

   ```powershell
   npm run build
   npm run test
   ```

   y, si tiene configurada `petcare_test`, también `npm run test:e2e`.

4. Abra un Pull Request hacia `develop` y describa los cambios, cómo probarlos y los resultados obtenidos.
5. Al menos otro integrante revisa el Pull Request antes de fusionarlo.
6. Integre `develop` en `Main` mediante un Pull Request cuando la versión esté probada.

### Convenciones del código

- Mantener la estructura entidad/DTO/controlador/servicio/módulo de cada módulo.
- Validar los cuerpos con `class-validator` y respetar los límites de las columnas.
- Usar `ParseUUIDPipe` en los parámetros `:id`.
- Lanzar `NotFoundException` cuando un registro o su relación no exista (también si pertenece a otro usuario).
- Tomar la identidad del usuario de `@CurrentUser()`, nunca del cuerpo de la petición.
- Marcar con `@Public()` solo las rutas que realmente deban ser públicas.
- Mantener los mensajes de respuesta en español y el formato `{ message, data }`.
- Documentar cada ruta nueva en Swagger y acompañar cada cambio con pruebas Vitest.

---

## Recursos

- [Documentación de NestJS](https://docs.nestjs.com)
- [Autenticación en NestJS](https://docs.nestjs.com/security/authentication)
- [Documentación de TypeORM](https://typeorm.io)
- [Documentación de class-validator](https://github.com/typestack/class-validator)
- [Postman: variables y autorización](https://learning.postman.com/docs/sending-requests/variables/variables/)
