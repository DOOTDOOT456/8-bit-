import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'emberfall.js',
        chunkFileNames: 'emberfall.js',
        assetFileNames: 'emberfall.[ext]',
      },
    },
  },
});
