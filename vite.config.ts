import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      
      // 🎯 PWA Plugin
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: false, // Usamos manifest.json manual
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
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
        devOptions: {
          enabled: false // Desabilitar em produção
        }
      }),
      
      // 🎯 Compressão (apenas em produção)
      isProduction && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024
      }),
      isProduction && compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024
      })
    ].filter(Boolean),
    
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
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-lucide': ['lucide-react'],
            'vendor-motion': ['motion']
          }
        }
      },
      cssCodeSplit: true,
      assetsInlineLimit: 4096
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', 'motion']
    },
    
    server: {
      port: 3000,
      host: true,
      hmr: false // Mantém compatibilidade com AI Studio
    },
    
    preview: {
      port: 4173,
      host: true
    }
  };
});