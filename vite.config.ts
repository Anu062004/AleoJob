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
                target: 'http://localhost:3001',
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
        sourcemap: true,
    },
    optimizeDeps: {
        exclude: ['@provablehq/sdk'],
    },
});
