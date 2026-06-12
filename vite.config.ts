import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // 🎯 PWA Plugin - Gera service worker automaticamente
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Lunara Agenda - Gestão Terapêutica',
        short_name: 'Lunara Agenda',
        description: 'Sistema completo de agendamento e gestão para terapeutas holísticos',
        theme_color: '#006699',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icone-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icone-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true // Habilita PWA em desenvolvimento também
      }
    }),
    
    // 🎯 Compressão Gzip/Brotli para produção
    compression({
      algorithm: 'brotliCompress',
      ext: '.br'
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz'
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@screens': path.resolve(__dirname, './src/screens'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // Desabilitar em produção para reduzir tamanho
    chunkSizeWarningLimit: 1000, // Alerta se chunk > 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-lucide': ['lucide-react'],
          'vendor-motion': ['motion'],
          'vendor-utils': ['date-fns']
        }
      },
      plugins: process.env.ANALYZE ? [visualizer({ open: true })] : []
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets < 4KB
    cssTarget: 'chrome61'
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'motion'],
    exclude: ['@supabase/supabase-js'] // Lazy load Supabase
  },
  
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    },
    warmup: {
      clientFiles: [
        './index.html',
        './src/main.tsx',
        './src/App.tsx',
        './src/screens/*.tsx'
      ]
    }
  },
  
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // Variáveis de ambiente tipadas
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
    __APP_ENV__: JSON.stringify(process.env.NODE_ENV)
  }
});