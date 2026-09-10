import { defineConfig } from 'vite';

// Get GitHub Pages base path from environment or default to root
const base = process.env.GITHUB_PAGES_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
    // Ensure empty base path works for GitHub Pages
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
});
