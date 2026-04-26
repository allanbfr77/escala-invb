import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    hmr: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'html2canvas'],
  },
})
