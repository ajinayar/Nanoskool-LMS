import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: 'mui', test: /node_modules[\\/]@(mui|emotion)[\\/]/ },
            { name: 'editor', test: /node_modules[\\/](@tiptap|prosemirror-[^\\/]+)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/files': 'http://localhost:4000',
    },
  },
});
