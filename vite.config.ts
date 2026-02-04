import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    envPrefix: 'NEXT_PUBLIC_',
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        'global': 'globalThis',
        'process.env': {},
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        target: 'esnext',
    },
    optimizeDeps: {
        exclude: ['@provablehq/sdk'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
});
