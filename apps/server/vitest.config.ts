import { defineProject } from 'vitest/config';

export default defineProject({
  esbuild: { jsx: 'automatic' },
  test: {
    name: 'server',
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
