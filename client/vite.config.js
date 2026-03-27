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
        open: false,
        warmup: {
            clientFiles: [
                './src/main.jsx',
                './src/App.jsx',
                './src/modules/public/pages/Home.jsx',
                './src/modules/auth/pages/Login.jsx',
                './src/modules/auth/pages/Register.jsx',
            ],
        },
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            '@supabase/supabase-js',
            '@mui/material',
            '@mui/icons-material',
            '@mui/x-data-grid',
            'framer-motion',
            'lucide-react',
            'react-hook-form',
            '@hookform/resolvers/zod',
            'zod',
            'sonner',
        ],
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/')
                    if (!normalizedId.includes('node_modules')) return

                    if (
                        normalizedId.includes('/node_modules/react/') ||
                        normalizedId.includes('/node_modules/react-dom/') ||
                        normalizedId.includes('/node_modules/scheduler/')
                    ) {
                        return 'vendor-react';
                    }
                    if (
                        normalizedId.includes('/node_modules/react-router/') ||
                        normalizedId.includes('/node_modules/react-router-dom/')
                    ) {
                        return 'vendor-router'
                    }
                    if (normalizedId.includes('/node_modules/@mui/icons-material/')) {
                        return 'vendor-mui-icons'
                    }
                    if (
                        normalizedId.includes('/node_modules/@mui/') ||
                        normalizedId.includes('/node_modules/@emotion/')
                    ) {
                        return 'vendor-mui';
                    }
                    if (
                        normalizedId.includes('/node_modules/recharts/') ||
                        normalizedId.includes('/node_modules/d3-') ||
                        normalizedId.includes('/node_modules/victory-vendor/')
                    ) {
                        return 'vendor-charts';
                    }
                    if (normalizedId.includes('/node_modules/@supabase/')) {
                        return 'vendor-supabase';
                    }
                    if (normalizedId.includes('/node_modules/@tanstack/react-query/')) {
                        return 'vendor-query';
                    }
                    if (
                        normalizedId.includes('/node_modules/framer-motion/') ||
                        normalizedId.includes('/node_modules/motion-dom/') ||
                        normalizedId.includes('/node_modules/motion-utils/') ||
                        normalizedId.includes('/node_modules/lucide-react/')
                    ) {
                        return 'vendor-motion';
                    }
                    if (
                        normalizedId.includes('/node_modules/@radix-ui/') ||
                        normalizedId.includes('/node_modules/aria-hidden/') ||
                        normalizedId.includes('/node_modules/get-nonce/') ||
                        normalizedId.includes('/node_modules/react-remove-scroll/') ||
                        normalizedId.includes('/node_modules/react-remove-scroll-bar/') ||
                        normalizedId.includes('/node_modules/react-style-singleton/') ||
                        normalizedId.includes('/node_modules/react-transition-group/') ||
                        normalizedId.includes('/node_modules/react-is/') ||
                        normalizedId.includes('/node_modules/tslib/') ||
                        normalizedId.includes('/node_modules/use-callback-ref/') ||
                        normalizedId.includes('/node_modules/use-sidecar/')
                    ) {
                        return 'vendor-misc'
                    }
                    if (
                        normalizedId.includes('/node_modules/react-hook-form/') ||
                        normalizedId.includes('/node_modules/@hookform/') ||
                        normalizedId.includes('/node_modules/zod/') ||
                        normalizedId.includes('/node_modules/zod-validation-error/')
                    ) {
                        return 'vendor-forms'
                    }
                    if (
                        normalizedId.includes('/node_modules/pdf-lib/') ||
                        normalizedId.includes('/node_modules/@pdf-lib/')
                    ) {
                        return 'vendor-pdf'
                    }
                    if (
                        normalizedId.includes('/node_modules/qrcode/') ||
                        normalizedId.includes('/node_modules/pngjs/') ||
                        normalizedId.includes('/node_modules/dijkstrajs/') ||
                        normalizedId.includes('/node_modules/react-qr-reader/') ||
                        normalizedId.includes('/node_modules/@zxing/')
                    ) {
                        return 'vendor-qr'
                    }
                    if (normalizedId.includes('/node_modules/openai/')) {
                        return 'vendor-ai'
                    }
                    if (
                        normalizedId.includes('/node_modules/zustand/') ||
                        normalizedId.includes('/node_modules/@reduxjs/') ||
                        normalizedId.includes('/node_modules/redux/') ||
                        normalizedId.includes('/node_modules/react-redux/') ||
                        normalizedId.includes('/node_modules/reselect/') ||
                        normalizedId.includes('/node_modules/immer/')
                    ) {
                        return 'vendor-state'
                    }
                    if (
                        normalizedId.includes('/node_modules/dayjs/') ||
                        normalizedId.includes('/node_modules/react-icons/') ||
                        normalizedId.includes('/node_modules/react-dropzone/') ||
                        normalizedId.includes('/node_modules/sonner/') ||
                        normalizedId.includes('/node_modules/class-variance-authority/') ||
                        normalizedId.includes('/node_modules/clsx/') ||
                        normalizedId.includes('/node_modules/tailwind-merge/') ||
                        normalizedId.includes('/node_modules/tailwindcss-animate/')
                    ) {
                        return 'vendor-utils'
                    }
                    return 'vendor-misc'
                },
            },
        },
    },
})
