import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yahooProxyPlugin from './server/yahooProxy.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    yahooProxyPlugin(), // Yahoo Finance crumb+cookie 인증 프록시
  ],
  server: {
    proxy: {
      // 기본 Yahoo Finance 프록시 (query1 - 헤더 포함)
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
        },
      },
      // 대체 Yahoo Finance 프록시 (query2)
      '/api/yahoo2': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo2/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
        },
      },
    },
  },
})
