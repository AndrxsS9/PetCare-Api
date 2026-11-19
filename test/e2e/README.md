# End-to-end tests (real PostgreSQL)

`npm run test:e2e` boots the real `AppModule` (JWT, roles, ownership,
ValidationPipe, TypeORM, Swagger) and sends real HTTP requests against a
**dedicated, disposable PostgreSQL database named `petcare_test`**.

The unit/HTTP suite (`npm run test`) does not need a database; this one does.

## Safety guarantees

Before the application is imported or any TypeORM connection is opened,
`setup-e2e.ts` and `e2e-app.ts` check that:

- the configuration comes only from `E2E_*` variables (`.env.e2e` or the
  process environment). Nothing falls back to `.env`.
- `E2E_DB_NAME` is `petcare_test` (or `petcare_test_<suffix>`), is repeated
  in `E2E_DB_CONFIRM`, and is different from `DB_NAME` in `.env`.
- the host is local, unless `E2E_ALLOW_REMOTE_DB=true`.
- `NODE_ENV` is not `production`.
- every `DB_*`, `JWT_*` and `SWAGGER_ENABLED` variable the app reads is set
  explicitly, and the app's own resolution (`getDatabaseConfig`) points to the
  test database.
- a read-only connection (no entities, no synchronize) confirms
  `current_database()`. After boot, the app's DataSource is checked again.

If any check fails, the run stops with an explanation and nothing is touched.

The suite never creates or drops databases, never uses `dropSchema` and never
truncates tables. It creates users with unique `e2e-<runId>-…@petcare-e2e.test`
emails and, at the end, deletes only those users. Their pets and pet records
are removed by the schema's `ON DELETE CASCADE` foreign keys.

`DB_SYNCHRONIZE` is forced to `true` only for the validated test database, so
TypeORM creates the schema there on the first run.

## One-time setup (Windows PowerShell)

1. Create the test database manually. Run this once as a PostgreSQL user that
   may create databases; `psql` must be in PATH:

   ```powershell
   psql -U postgres -h localhost -c "CREATE DATABASE petcare_test;"
   ```

   The schema uses `uuid_generate_v4()`. If the e2e user is not a superuser,
   enable the extension once as a superuser:

   ```powershell
   'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' | psql -U postgres -h localhost -d petcare_test
   ```

   (The SQL is piped through stdin because Windows PowerShell 5.1 strips the
   inner double quotes from native command arguments.)

2. Create the private configuration from the template (git-ignored):

   ```powershell
   Copy-Item .env.e2e.example .env.e2e
   notepad .env.e2e
   ```

   Fill in `E2E_DB_USERNAME`, `E2E_DB_PASSWORD`, set
   `E2E_DB_CONFIRM=petcare_test`, and paste a generated secret into
   `E2E_JWT_SECRET`:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

## Running

```powershell
npm run test:e2e
```

You can use real environment variables instead of the file. They take
precedence over `.env.e2e`:

```powershell
$env:E2E_DB_HOST = 'localhost'
$env:E2E_DB_PORT = '5432'
$env:E2E_DB_USERNAME = 'your_test_db_user'
$env:E2E_DB_PASSWORD = 'your_test_db_password'
$env:E2E_DB_NAME = 'petcare_test'
$env:E2E_DB_CONFIRM = 'petcare_test'
$env:E2E_JWT_SECRET = (node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
npm run test:e2e
```

## Leftover data

If a run is interrupted before its cleanup, its users remain in `petcare_test`.
Every run uses a new `runId`, so leftovers never collide with later runs. To
remove them manually from the **test** database:

```powershell
psql -U postgres -h localhost -d petcare_test -c "DELETE FROM usuarios WHERE email LIKE 'e2e-%@petcare-e2e.test';"
```
