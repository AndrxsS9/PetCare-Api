import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * End-to-end suite against a REAL, dedicated PostgreSQL test database.
 * See test/e2e/README.md. `setup-e2e.ts` validates the isolated database
 * configuration before any test file (and therefore the app) is loaded.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/e2e/setup-e2e.ts'],
    // Files share one database and each boots the app (schema synchronize),
    // so they run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
