import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // esbuild 0.28+ errors when lowering destructuring for Safari 14.0 targets.
  // Vite's default "modules" target includes safari14 — keep native destructuring.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
  optimizeDeps: {
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
        '**/dist/**',
        '**/generated/**',
        '**/*.tsbuildinfo',
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
