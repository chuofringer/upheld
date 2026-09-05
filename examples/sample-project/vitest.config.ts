import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['examples/sample-project/tests/**/*.test.ts'],
  },
});
