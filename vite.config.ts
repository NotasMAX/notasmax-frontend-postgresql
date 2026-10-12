import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error The Vite config runs in Node; app types stay browser-only.
import { resolve } from 'node:path';
// @ts-expect-error The Vite config runs in Node; app types stay browser-only.
import { cwd } from 'node:process';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      './developmentRoutes': resolve(
        cwd(),
        'src',
        'app',
        command === 'serve' ? 'developmentRoutes.tsx' : 'productionRoutes.tsx',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
