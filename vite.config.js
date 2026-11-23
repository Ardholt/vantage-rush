import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// One self-contained IIFE bundle (module scripts do not run from file:// in Chrome); scripts/build.mjs inlines it.
export default defineConfig({
  build: {
    outDir: 'scratch/bundle', emptyOutDir: true, minify: true, chunkSizeWarningLimit: 2000,
    lib: { entry: resolve(import.meta.dirname, 'src/main.js'), formats: ['iife'], name: 'VantageRush', fileName: () => 'rush.js' },
  },
});
