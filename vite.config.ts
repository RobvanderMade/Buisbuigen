import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Luister op IPv4 én IPv6 — anders opent 127.0.0.1 een andere/geen pagina op Windows.
    host: true,
    port: 5173,
    strictPort: true,
    open: '/',
  },
})
