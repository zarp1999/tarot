import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project site: https://zarp1999.github.io/tarot/
// Override locally with VITE_BASE=/ if needed.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
