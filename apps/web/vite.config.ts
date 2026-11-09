import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // The API and the server-rendered portfolio pages live on the Express server.
      '/api': { target: apiTarget, changeOrigin: false },
      '/u/': { target: apiTarget, changeOrigin: false },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code into cacheable chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /[\\/](@tiptap|prosemirror-[^\\/]+|orderedmap|rope-sequence|w3c-keyname|linkifyjs)[\\/]/.test(
              id,
            )
          )
            return 'editor';
          if (/[\\/]@dnd-kit[\\/]/.test(id)) return 'dnd';
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return 'react';
          return undefined;
        },
      },
    },
  },
});
