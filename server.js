// Express server to handle API routes (converted from Next.js format)
// Run this with: npm run dev:api or node server.js

// Load environment variables FIRST
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global error handler middleware - MUST be before routes
app.use((err, req, res, next) => {
  console.error('[Express] UNHANDLED ERROR:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

// Import API route handlers
// Using src/api which has proper path resolution for tsx
async function setupRoutes() {
  try {
    // Import the accept route handler from src/api
    const acceptRoute = await import('./src/api/accept-application.ts');
    app.post('/api/jobs/accept', acceptRoute.handleAcceptApplication);
    app.get('/api/jobs/accept', acceptRoute.handleGetAccept);
    console.log('✅ /api/jobs/accept route registered');
  } catch (error) {
    console.error('❌ Failed to load API routes:', error);
    console.error('Error details:', error.stack);
    // Fallback: provide a helpful error message
    app.post('/api/jobs/accept', (req, res) => {
      res.status(500).json({
        success: false,
        error: 'API route handler not loaded. Check server logs.',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    });
  }
}

// Setup routes and start server
setupRoutes().then(() => {
  // --- PRODUCTION SETUP ---
  // Serve static files from the Vite build directory 'dist'
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));

  // Handle React Router - redirect all unknown routes to index.html
  // This must be AFTER API routes
  // Use app.use for catch-all in Express 5 (compatible with Express 5.x)
  app.use((req, res, next) => {
    // If it's an API call that wasn't caught, return 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'API route not found' });
    }
    // Otherwise serve index.html for all other routes (SPA fallback)
    const indexPath = join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).send('Internal Server Error');
      }
    });
  });
  // -----------------------

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Serving frontend from: ${distPath}`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
