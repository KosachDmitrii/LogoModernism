import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    globalSetup: [resolve(__dirname, 'tests/global-setup.ts')],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/eval/**/*.eval.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    reporters: ['verbose'],
  },
});
