import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: repoRoot,
  // esbuild 0.28+ errors when lowering destructuring for Safari 14.0 targets.
  // Vite's default "modules" target includes safari14 — keep native destructuring.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
  resolve: {
    // Prefer TypeScript sources so new shared exports work without stale CJS dist cache.
    alias: {
      '@logo-platform/shared': path.resolve(repoRoot, 'packages/shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@logo-platform/shared'],
    esbuildOptions: {
      supported: {
        destructuring: true,
      },
    },
  },
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/tsconfig.tsbuildinfo',
        '**/generated/**',
        '**/*.tsbuildinfo',
        // Ignore package build outputs (shared is aliased to src, so this is safe).
        '**/packages/*/dist/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
