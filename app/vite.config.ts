/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the production build as a project site at /tram/, not
// at the domain root, so the built asset URLs and the PWA scope need that
// prefix — but only for `vite build`. Applying it to `vite dev` too would
// mean the dev server only serves the app at /tram/ instead of /, breaking
// local testing (e.g. over a tunnel like localtunnel/ngrok).
const BASE = '/tram/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  server: {
    // Dev server normally rejects requests whose Host header isn't
    // localhost/a configured domain — which is exactly what a tunnel
    // (localtunnel, ngrok, cloudflared) sends, so this needs to be open to
    // test on a phone via a tunnel.
    allowedHosts: true,
  },
  plugins: [
    react(),
    // Camera access requires HTTPS (or localhost) — this gives the dev
    // server a self-signed cert so it can be reached securely from a phone
    // on the same Wi-Fi, at https://<lan-ip>:5173 (run `npm run dev --
    // --host` to expose it). Build-time only concern is dev, so skip it for
    // `vite build` (the deployed site is already served over real HTTPS).
    ...(command === 'build' ? [] : [basicSsl()]),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'],
      manifest: {
        name: 'Print Pak',
        short_name: 'Print Pak',
        description: 'Dither photos for thermal receipt printers.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#9BBC0F',
        theme_color: '#C5C0B4',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Ignore query-string requests (the original sw.js let those hit the
        // network directly rather than serving a cached copy).
        navigateFallbackDenylist: [/\?/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
}))
