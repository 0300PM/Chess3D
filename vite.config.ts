import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.fbx'],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true
  }
});
