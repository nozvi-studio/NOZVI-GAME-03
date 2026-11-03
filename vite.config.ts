import { defineConfig } from 'vite';

// Phaser alone is about 1.2 MB minified; raise the warning limit so the build log stays readable.
const PHASER_CHUNK_WARNING_KB = 2000;

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: PHASER_CHUNK_WARNING_KB },
});
