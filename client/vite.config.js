import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;

                    if (id.includes('/react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
                        return 'vendor-react';
                    }
                    if (id.includes('@mui') || id.includes('@emotion')) {
                        return 'vendor-mui';
                    }
                    if (id.includes('recharts') || id.includes('d3-')) {
                        return 'vendor-charts';
                    }
                    if (id.includes('@supabase')) {
                        return 'vendor-supabase';
                    }
                    if (id.includes('@tanstack/react-query')) {
                        return 'vendor-query';
                    }
                    if (id.includes('framer-motion') || id.includes('lucide-react')) {
                        return 'vendor-motion';
                    }
                    return 'vendor-misc';
                },
            },
        },
    },
})
