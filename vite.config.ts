import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
});
