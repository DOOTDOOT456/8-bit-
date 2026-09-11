import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Get GitHub Pages base path from environment or default to root
const base = process.env.GITHUB_PAGES_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'esnext',
    // Ensure empty base path works for GitHub Pages
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
});
