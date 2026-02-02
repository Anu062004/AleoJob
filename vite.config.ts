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
        // Resolve 'global' is not defined issues in some SDKs
        'global': 'window',
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            },
        },
        fs: {
            strict: false,
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        target: 'esnext',
        rollupOptions: {
            output: {
                format: 'es',
            },
        },
    },
    optimizeDeps: {
        exclude: ['@provablehq/sdk'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
});
