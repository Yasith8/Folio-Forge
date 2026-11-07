import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/shared', 'packages/templates', 'apps/server', 'apps/web'],
  },
});
