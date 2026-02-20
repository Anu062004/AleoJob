// Express API + static server for AleoJob (Vite build output)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3101);

app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  console.error('[Express] Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: err?.message || 'Internal Server Error',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

async function setupRoutes() {
  try {
    const reputationRoutes = await import('./src/api/reputation.ts');

    app.post('/api/reputation/recalculate', reputationRoutes.handleRecalculateReputation);

    console.log('[API] Registered reputation routes');
  } catch (error) {
    console.error('[API] Failed to load reputation routes:', error);
  }

  try {
    const accessRoutes = await import('./src/api/access-verification.ts');

    app.post('/api/access/verify', accessRoutes.handleVerifyAccess);

    console.log('[API] Registered access verification routes');
  } catch (error) {
    console.error('[API] Failed to load access verification routes:', error);
  }

  try {
    const workProofRoutes = await import('./src/api/work-proof.ts');

    app.post('/api/work-proofs/submit', workProofRoutes.handleSubmitWorkProof);
    app.post('/api/work-proofs/verify', workProofRoutes.handleVerifyWorkProof);

    console.log('[API] Registered work proof routes');
  } catch (error) {
    console.error('[API] Failed to load work proof routes:', error);
  }

  try {
    const acceptRoute = await import('./src/api/accept-application.ts');

    app.post('/api/jobs/accept', acceptRoute.handleAcceptApplication);
    app.post('/api/jobs/:applicationId/accept', (req, res) => {
      req.body = {
        ...(req.body || {}),
        applicationId: req.body?.applicationId || req.params.applicationId,
      };
      return acceptRoute.handleAcceptApplication(req, res);
    });
    app.get('/api/jobs/accept', acceptRoute.handleGetAccept);

    console.log('[API] Registered accept routes');
  } catch (error) {
    console.error('[API] Failed to load accept routes:', error);
    app.post('/api/jobs/accept', (req, res) => {
      res.status(500).json({
        success: false,
        error: 'Accept route handler failed to load',
        message: error?.message || 'Unknown error',
      });
    });
  }

  try {
    const createJobRoute = await import('./src/api/create-job.ts');

    app.post('/api/jobs/create', createJobRoute.handleCreateJob);

    console.log('[API] Registered create-job routes');
  } catch (error) {
    console.error('[API] Failed to load create-job routes:', error);
    app.post('/api/jobs/create', (req, res) => {
      res.status(500).json({
        success: false,
        error: 'Create-job route handler failed to load',
        message: error?.message || 'Unknown error',
      });
    });
  }

  try {
    const giverJobsRoute = await import('./src/api/giver-jobs.ts');

    app.post('/api/giver/jobs', giverJobsRoute.handleGetGiverJobs);

    console.log('[API] Registered giver jobs routes');
  } catch (error) {
    console.error('[API] Failed to load giver jobs routes:', error);
  }

  try {
    const escrowRoutes = await import('./src/api/escrow-actions.ts');

    app.post('/api/aleo/escrow/release', escrowRoutes.handleReleaseEscrow);
    app.post('/api/aleo/escrow/refund', escrowRoutes.handleRefundEscrow);

    app.post('/api/escrows/:id/release', (req, res) => {
      req.body = { ...(req.body || {}), escrowId: req.params.id };
      return escrowRoutes.handleReleaseEscrow(req, res);
    });

    app.post('/api/escrows/:id/refund', (req, res) => {
      req.body = { ...(req.body || {}), escrowId: req.params.id };
      return escrowRoutes.handleRefundEscrow(req, res);
    });

    console.log('[API] Registered escrow routes');
  } catch (error) {
    console.error('[API] Failed to load escrow routes:', error);
  }

  try {
    const escrowSyncRoutes = await import('./src/api/escrow-record-sync.ts');

    app.post('/api/escrows/sync-records', escrowSyncRoutes.handleSyncEscrowRecords);
    app.post('/api/escrow/sync-records', escrowSyncRoutes.handleSyncEscrowRecords);

    console.log('[API] Registered escrow sync routes');
  } catch (error) {
    console.error('[API] Failed to load escrow sync routes:', error);
  }

  try {
    const txReconcileRoutes = await import('./src/api/tx-reconciliation.ts');

    app.post('/api/transactions/reconcile', txReconcileRoutes.handleReconcileTransactions);
    app.post('/api/tx/reconcile', txReconcileRoutes.handleReconcileTransactions);

    console.log('[API] Registered transaction reconciliation routes');
  } catch (error) {
    console.error('[API] Failed to load transaction reconciliation routes:', error);
  }
}

async function startBackgroundJobs() {
  try {
    const escrowSyncRoutes = await import('./src/api/escrow-record-sync.ts');
    const intervalMs = Math.max(Number(process.env.ESCROW_SYNC_INTERVAL_MS || 45000), 5000);
    const defaultLimit = Math.max(Number(process.env.ESCROW_SYNC_BATCH_SIZE || 25), 1);

    await escrowSyncRoutes.runEscrowRecordSync({ limit: defaultLimit });

    const timer = setInterval(() => {
      escrowSyncRoutes
        .runEscrowRecordSync({ limit: defaultLimit })
        .catch((error) => console.error('[Jobs] Escrow record sync failed:', error));
    }, intervalMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    console.log(`[Jobs] Escrow record sync started (interval=${intervalMs}ms, batch=${defaultLimit})`);
  } catch (error) {
    console.error('[Jobs] Failed to start background jobs:', error);
  }

  try {
    const txReconcileRoutes = await import('./src/api/tx-reconciliation.ts');
    const intervalMs = Math.max(Number(process.env.TX_RECONCILE_INTERVAL_MS || 60000), 5000);
    const defaultLimit = Math.max(Number(process.env.TX_RECONCILE_BATCH_SIZE || 40), 1);

    await txReconcileRoutes.runTransactionReconciliation({ limit: defaultLimit, includeAccessPayments: true });

    const timer = setInterval(() => {
      txReconcileRoutes
        .runTransactionReconciliation({ limit: defaultLimit, includeAccessPayments: true })
        .catch((error) => console.error('[Jobs] Transaction reconciliation failed:', error));
    }, intervalMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    console.log(`[Jobs] Transaction reconciliation started (interval=${intervalMs}ms, batch=${defaultLimit})`);
  } catch (error) {
    console.error('[Jobs] Failed to start transaction reconciliation:', error);
  }
}

setupRoutes()
  .then(async () => {
    await startBackgroundJobs();

    const distPath = join(__dirname, 'dist');
    app.use(express.static(distPath));

    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          success: false,
          message: `Route ${req.method} ${req.path} not found`,
        });
      }

      const indexPath = join(distPath, 'index.html');
      return res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('[Express] Failed to send index.html:', err);
          res.status(500).send('Internal Server Error');
        }
      });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(`[Server] Serving frontend from: ${distPath}`);
    });
  })
  .catch((error) => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  });
