import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  /** Ingebouwd in buigmachine op /simulation/ */
  base: '/simulation/',
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    open: '/simulation/',
  },
})
