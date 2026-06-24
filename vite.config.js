// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            // We want the app to update the service worker immediately and claim all clients
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true, // Enables PWA checking while running npm run dev
                type: 'module',
            },
            manifest: {
                name: 'Store Management System',
                short_name: 'SMS',
                description: 'PWA for managing store inventory, sales, and expenses.',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: './index.html',
                scope: './',
                icons: [
                    {
                        src: 'icon.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    },
                    {
                        src: 'icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'maskable'
                    }
                ]
            },
            injectRegister: 'auto',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
                cleanupOutdatedCaches: true,
            },
        })
    ],
    server: {
        port: 5173,
        strictPort: true
    },
    base: './',
});
