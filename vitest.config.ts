import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/__tests__/**', 'components/__tests__/**', 'components/orders/__tests__/**'],
    exclude: ['node_modules/', 'tests/', 'out/', '.next/'],
  },
});