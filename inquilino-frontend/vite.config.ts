import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'
import fs from 'fs'

// Copies the PDF.js worker to public/ as .js so every server (Tomcat, Nginx, …)
// serves it as application/javascript without extra MIME-type configuration.
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    buildStart() {
      const src  = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
      const dest = path.resolve(__dirname, 'public/pdf.worker.min.js')
      if (fs.existsSync(src)) fs.copyFileSync(src, dest)
    },
  }
}

export default defineConfig({
  plugins: [react(), basicSsl(), copyPdfjsWorker()],
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
