import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // In live API mode (VITE_DATA_MODE=api), proxy Fastify routes to avoid CORS in dev.
      // This is transparent to the frontend — fetch('/cases') works in both dev and prod.
      '/cases': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/evidence': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/demo': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
