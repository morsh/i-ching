/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

/**
 * Vite configuration for the I-Ching Oracle.
 *
 * The app is a fully static, stateless single-page site: it builds to plain
 * HTML/JS/CSS in `dist/` and requires no backend at runtime.
 */
export default defineConfig({
  // Relative base so the built site can be hosted from any subpath.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
