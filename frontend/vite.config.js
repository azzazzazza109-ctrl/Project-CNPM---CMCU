import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Frontend chạy cổng 3001
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Trỏ về Backend cổng 3000
        changeOrigin: true,
        secure: false,
      }
    }
  }
})