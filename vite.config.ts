import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Baked in at compile time and reported in Settings -> About. The git tag is the only
// source of truth: CI passes it as APP_VERSION, and any other build is `dev`.
// The server does the same with -ldflags, so the two numbers always come from one tag
const appVersion = process.env.APP_VERSION || 'dev'

const port = Number(process.env.WEB_PORT || process.env.PORT || 1401)
const apiTarget = process.env.API_UPSTREAM || 'http://localhost:8000'
const apiProxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: false,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: { port, proxy: apiProxy },
  preview: { port, proxy: apiProxy },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'LibreLock',
        short_name: 'LibreLock',
        description: 'End-to-end encrypted password manager',
        start_url: '/',
        display: 'standalone',
        // Matches the dark shell theme-init.js defaults to, so the splash doesn't flash white
        background_color: '#030712',
        theme_color: '#030712',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Static shell only, never cache or serve API responses (auth cookies, encrypted blobs)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
