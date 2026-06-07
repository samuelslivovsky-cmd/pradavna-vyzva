import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// base: './' => relatívne cesty, takže build funguje na akomkoľvek hostingu
// (Netlify / Vercel / GitHub Pages aj z podpriečinka).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        test: fileURLToPath(new URL('./test.html', import.meta.url)),
        attempts: fileURLToPath(new URL('./attempts.html', import.meta.url)),
      },
    },
  },
})
