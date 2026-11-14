import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/db/migrate-cli.ts', 'src/db/seed-cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: true,
  // Workspace packages ship TypeScript source, so bundle them into the server build.
  noExternal: [/^@folioforge\//],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
