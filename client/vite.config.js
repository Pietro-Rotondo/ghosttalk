import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Permite acesso externo (necessário para túneis como Cloudflare)
    host: '0.0.0.0',
    // Proxy para o servidor backend em desenvolvimento
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
    // Permite acesso via túnel cloudflare (host arbitrário)
    allowedHosts: 'all',
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Desabilita sourcemaps em produção por segurança
  },
});
