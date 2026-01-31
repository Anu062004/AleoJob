import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    envPrefix: 'NEXT_PUBLIC_',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                // Don't rewrite the path - proxy as-is
            },
        },
        // Exclude app directory from Vite's module resolution
        fs: {
            strict: false,
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false, // Disable sourcemaps in production for smaller builds
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'aleo-vendor': ['@provablehq/sdk', '@provablehq/aleo-wallet-adaptor-react'],
                },
            },
        },
    },
    optimizeDeps: {
        exclude: ['@provablehq/sdk'],
    },
});
