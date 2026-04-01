import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change base to '/recrue-atlas/' if deploying to GitHub Pages subfolder
// e.g. yourusername.github.io/recrue-atlas
// For a custom domain or root deployment, use base: '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
