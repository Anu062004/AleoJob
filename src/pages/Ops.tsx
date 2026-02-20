import { useMemo, useState } from 'react';
import { Activity, Database, Loader2, RefreshCw, Wrench } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { apiRequest } from '@/lib/apiClient';
import { hasOpsAdminAllowlist, isOpsAdminAddress } from '@/lib/adminAccess';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/web3/EmptyState';

type SyncStatus = 'updated' | 'reverted' | 'unresolved' | 'skipped';

interface SyncEntry {
  type?: 'escrow' | 'access_payment' | 'reconciliation';
  id: string;
  status: SyncStatus;
  reason?: string;
}

interface EscrowSyncSummary {
  scanned: number;
  updated: number;
  unresolved: number;
  skipped: number;
  entries: SyncEntry[];
}

interface ReconcileSummary {
  scannedEscrows: number;
  updatedEscrows: number;
  revertedEscrows: number;
  scannedAccessPayments: number;
  updatedAccessPayments: number;
  unresolved: number;
  skipped: number;
  entries: SyncEntry[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): string {
  const maxLines = Math.max(1, Math.min(lines.length, 56));
  const contentLines = lines.slice(0, maxLines);
  const content =
    `BT\n/F1 10 Tf\n14 TL\n40 800 Td\n` +
    contentLines.map((line, index) => `${index === 0 ? '' : 'T* ' }(${escapePdfText(line)}) Tj`).join('\n') +
    `\nET\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function downloadPdfFile(filename: string, lines: string[]) {
  const pdfText = buildSimplePdf(lines);
  const blob = new Blob([pdfText], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Badge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface px-3 py-2">
      <p className="text-xs uppercase tracking-[0.16em] text-brand-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brand-text">{value}</p>
    </div>
  );
}

function statusClass(status: SyncStatus): string {
  if (status === 'updated') return 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10';
  if (status === 'reverted') return 'text-amber-300 border-amber-500/25 bg-amber-500/10';
  if (status === 'unresolved') return 'text-rose-300 border-rose-500/25 bg-rose-500/10';
  return 'text-brand-text-muted border-brand-border bg-brand-surface';
}

function EntryRow({ entry }: { entry: SyncEntry }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${statusClass(entry.status)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-[0.12em]">{entry.status}</span>
        <span className="font-mono">{entry.type || 'sync'}:{entry.id}</span>
      </div>
      {entry.reason && <p className="mt-1">{entry.reason}</p>}
    </div>
  );
}

function Ops() {
  const { connected, address } = useWallet();
  const [syncingRecords, setSyncingRecords] = useState(false);
  const [reconcilingTx, setReconcilingTx] = useState(false);
  const [syncSummary, setSyncSummary] = useState<EscrowSyncSummary | null>(null);
  const [reconcileSummary, setReconcileSummary] = useState<ReconcileSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const opsAllowlistConfigured = hasOpsAdminAllowlist();
  const isAdmin = useMemo(() => isOpsAdminAddress(address), [address]);

  const hasEntries = useMemo(() => {
    return Boolean(
      (syncSummary?.entries && syncSummary.entries.length > 0) ||
      (reconcileSummary?.entries && reconcileSummary.entries.length > 0)
    );
  }, [syncSummary, reconcileSummary]);

  const runEscrowRecordSync = async () => {
    if (!address) {
      setErrorMessage('Wallet address is unavailable.');
      return;
    }

    setSyncingRecords(true);
    setErrorMessage('');
    try {
      const response = await apiRequest<ApiEnvelope<EscrowSyncSummary>>('/api/escrows/sync-records', {
        method: 'POST',
        body: { limit: 60, aleoAddress: address },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Escrow record sync failed');
      }

      setSyncSummary(response.data);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Escrow record sync failed');
    } finally {
      setSyncingRecords(false);
    }
  };

  const runTxReconciliation = async () => {
    if (!address) {
      setErrorMessage('Wallet address is unavailable.');
      return;
    }

    setReconcilingTx(true);
    setErrorMessage('');
    try {
      const response = await apiRequest<ApiEnvelope<ReconcileSummary>>('/api/transactions/reconcile', {
        method: 'POST',
        body: { limit: 80, includeAccessPayments: true, aleoAddress: address },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Transaction reconciliation failed');
      }

      setReconcileSummary(response.data);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Transaction reconciliation failed');
    } finally {
      setReconcilingTx(false);
    }
  };

  const runFullMaintenance = async () => {
    await runEscrowRecordSync();
    await runTxReconciliation();
  };

  const downloadOpsPdf = () => {
    const timestamp = new Date();
    const lines: string[] = [
      'AleoJob Ops Report',
      `Generated: ${timestamp.toISOString()}`,
      `Wallet: ${address || 'unknown'}`,
      '',
    ];

    if (syncSummary) {
      lines.push('Escrow Record Sync');
      lines.push(`Scanned: ${syncSummary.scanned}`);
      lines.push(`Updated: ${syncSummary.updated}`);
      lines.push(`Unresolved: ${syncSummary.unresolved}`);
      lines.push(`Skipped: ${syncSummary.skipped}`);
      for (const entry of syncSummary.entries.slice(0, 12)) {
        lines.push(`- ${entry.status.toUpperCase()} ${entry.type || 'sync'}:${entry.id}${entry.reason ? ` | ${entry.reason}` : ''}`);
      }
      lines.push('');
    }

    if (reconcileSummary) {
      lines.push('Transaction Reconciliation');
      lines.push(`Escrows Scanned: ${reconcileSummary.scannedEscrows}`);
      lines.push(`Escrows Updated: ${reconcileSummary.updatedEscrows}`);
      lines.push(`Escrows Reverted: ${reconcileSummary.revertedEscrows}`);
      lines.push(`Access Updated: ${reconcileSummary.updatedAccessPayments}`);
      lines.push(`Unresolved: ${reconcileSummary.unresolved}`);
      lines.push(`Skipped: ${reconcileSummary.skipped}`);
      for (const entry of reconcileSummary.entries.slice(0, 12)) {
        lines.push(`- ${entry.status.toUpperCase()} ${entry.type || 'sync'}:${entry.id}${entry.reason ? ` | ${entry.reason}` : ''}`);
      }
    }

    if (!syncSummary && !reconcileSummary) {
      lines.push('No maintenance summary is available yet.');
      lines.push('Run sync/reconciliation first, then export.');
    }

    const fileName = `aleojob-ops-report-${timestamp.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
    downloadPdfFile(fileName, lines);
  };

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Wallet Not Initialized"
          description="Initialize wallet to access the protocol ops panel."
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Ops Access Restricted"
          description={
            opsAllowlistConfigured
              ? 'This wallet is not in the configured ops admin allowlist.'
              : 'Ops admin allowlist is not configured. Set VITE_OPS_ADMIN_ADDRESSES and OPS_ADMIN_ADDRESSES.'
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-6">
      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">Ops</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-text">Protocol Maintenance</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-text-muted">
              Run escrow record sync and transaction reconciliation manually to recover out-of-sync chain/database state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runEscrowRecordSync} disabled={syncingRecords || reconcilingTx} variant="secondary">
              {syncingRecords ? <Loader2 className="animate-spin" size={15} /> : <Database size={15} />}
              Sync Escrow Records
            </Button>
            <Button onClick={runTxReconciliation} disabled={syncingRecords || reconcilingTx} variant="outline">
              {reconcilingTx ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
              Reconcile Transactions
            </Button>
            <Button onClick={runFullMaintenance} disabled={syncingRecords || reconcilingTx}>
              {(syncingRecords || reconcilingTx) ? <Loader2 className="animate-spin" size={15} /> : <Wrench size={15} />}
              Run Full Maintenance
            </Button>
            <Button onClick={downloadOpsPdf} disabled={syncingRecords || reconcilingTx} variant="ghost">
              Download PDF Report
            </Button>
          </div>
        </div>
      </section>

      {errorMessage && (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {errorMessage}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database size={16} className="text-brand-secondary" />
            <h2 className="text-lg font-semibold text-brand-text">Escrow Record Sync</h2>
          </div>
          {syncSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Badge label="Scanned" value={syncSummary.scanned} />
                <Badge label="Updated" value={syncSummary.updated} />
                <Badge label="Unresolved" value={syncSummary.unresolved} />
                <Badge label="Skipped" value={syncSummary.skipped} />
              </div>
              <div className="space-y-2">
                {syncSummary.entries.slice(0, 8).map((entry, index) => (
                  <EntryRow key={`${entry.id}-${index}`} entry={entry} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Run sync to view escrow record updates.</p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-brand-secondary" />
            <h2 className="text-lg font-semibold text-brand-text">Transaction Reconciliation</h2>
          </div>
          {reconcileSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Badge label="Escrows Scanned" value={reconcileSummary.scannedEscrows} />
                <Badge label="Escrows Updated" value={reconcileSummary.updatedEscrows} />
                <Badge label="Escrows Reverted" value={reconcileSummary.revertedEscrows} />
                <Badge label="Access Updated" value={reconcileSummary.updatedAccessPayments} />
              </div>
              <div className="space-y-2">
                {reconcileSummary.entries.slice(0, 8).map((entry, index) => (
                  <EntryRow key={`${entry.id}-${index}`} entry={entry} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Run reconciliation to inspect tx finality corrections.</p>
          )}
        </div>
      </section>

      {!hasEntries && (
        <section className="glass-card rounded-2xl p-6 text-sm text-brand-text-muted">
          No maintenance logs yet. Run an operation above to generate a summary.
        </section>
      )}
    </div>
  );
}

export default Ops;
