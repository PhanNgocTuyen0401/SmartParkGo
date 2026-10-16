import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['smartpark-logo.png', 'robots.txt', '*.png'],
      manifest: {
        name: 'SmartPark Đà Nẵng',
        short_name: 'SmartPark',
        description: 'Hệ thống đỗ xe thông minh SmartPark – TP. Đà Nẵng',
        theme_color: '#0284c7',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        lang: 'vi',
        icons: [
          { src: '/smartpark-logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/smartpark-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cache API responses
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:5000\/api\/(parking|vouchers)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'smartpark-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }, // 5 phút
              networkTimeoutSeconds: 5
            }
          },
          // Cache images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'smartpark-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 7 } // 7 ngày
            }
          }
        ],
        // Bỏ qua Socket.IO khỏi service worker
        navigateFallbackDenylist: [/^\/socket\.io/, /^\/api/]
      },
      devOptions: {
        enabled: false // tắt PWA trong dev để tránh cache issues
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('lucide') || id.includes('bootstrap')) {
              return 'ui-vendor';
            }
            if (id.includes('jsqr') || id.includes('qrcode')) {
              return 'qr-vendor';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
