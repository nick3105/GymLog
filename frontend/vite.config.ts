import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Flask serves the current UI at /; this app is previewed at /next/ until it replaces it.
  base: '/next/',
  server: {
    // In development Flask runs separately; in production it serves dist/ itself.
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
})
