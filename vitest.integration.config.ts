import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    sequence: { concurrent: false, shuffle: false },
  },
});
