import { applyE2eEnvironment, loadE2eConfig } from './e2e-config.js';

/**
 * Vitest setup file for the e2e config only. Runs before each e2e test file
 * is imported: validates the isolated test database configuration and
 * applies it to process.env, or throws (and nothing connects).
 */
applyE2eEnvironment(loadE2eConfig());
