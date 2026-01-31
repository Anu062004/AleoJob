import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    envPrefix: 'NEXT_PUBLIC_',
    base: '/', // Ensure base path is correct for Vercel
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
        target: 'esnext', // Support modern JS features including top-level await
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    // Exclude @provablehq/sdk from chunking to avoid top-level await issues
                    // It will be bundled inline or as a separate ES module
                    if (id.includes('@provablehq/sdk')) {
                        return undefined; // Don't create a manual chunk for this
                    }
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'react-vendor';
                        }
                        if (id.includes('@provablehq/aleo-wallet-adaptor')) {
                            return 'aleo-wallet';
                        }
                        return 'vendor';
                    }
                },
                // Ensure all chunks use ES module format to support top-level await
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
