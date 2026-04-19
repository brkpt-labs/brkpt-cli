import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@auth': resolve(__dirname, 'src/commands/auth'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
});
