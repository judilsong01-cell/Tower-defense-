import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works inside the Capacitor WebView and on any static host.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
