import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000, // 이 부분을 추가하여 3000번 포트로 고정합니다
    proxy: {
      '/api': {
        target: 'https://runstop.hurwan.net',
        changeOrigin: true,
      },
    },
  },
})