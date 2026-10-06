import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tenderDetails: resolve(__dirname, 'tender-details/index.html'),
        uploadDocuments: resolve(__dirname, 'upload-documents/index.html'),
        matchCheck: resolve(__dirname, 'match-check/index.html'),
        preview: resolve(__dirname, 'preview/index.html'),
        generate: resolve(__dirname, 'generate/index.html')
      }
    }
  }
});
