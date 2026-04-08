import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // API calls
      '/api': { target: 'http://192.168.1.61:8080', changeOrigin: true },
      // OAuth2 flow: backend handles the full redirect dance
      '/oauth2':        { target: 'http://192.168.1.61:8080', changeOrigin: true },
      '/login/oauth2':  { target: 'http://192.168.1.61:8080', changeOrigin: true },
      // MinIO media — proxato in HTTPS per evitare Mixed Content
      '/minio': { target: 'http://192.168.1.61:9000', changeOrigin: true, rewrite: (p) => p.replace(/^\/minio/, '') },
    },
  },
})
