import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './client',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      // client/src/lib/brt.js re-exporta api/_lib/brt.js, que fica fora do root
      // do Vite. Sem isso o dev server recusa servir o arquivo.
      allow: ['..'],
    },
    proxy: {
      // O front (5173) fala com o servidor de dev que carrega os handlers de
      // api/ (3000). Mesma origem via proxy, entao o cookie de sessao viaja.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})
