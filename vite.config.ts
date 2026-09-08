import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon16.png', 'icon48.png', 'icon128.png'],
        manifest: {
          name: 'Audiobook & Leitor Universal',
          short_name: 'Leitor PWA',
          description: 'Leitor e narrador universal com vozes naturais do sistema',
          theme_color: '#d97706',
          background_color: '#1e232a',
          display: 'standalone',
          icons: [
            {
              src: 'icon48.png',
              sizes: '48x48',
              type: 'image/png'
            },
            {
              src: 'icon128.png',
              sizes: '128x128',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
