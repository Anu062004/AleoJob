import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from '@/components/ui/Button';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { TransactionModal } from './TransactionModal';
import { ApiRequestError, apiRequest } from '@/lib/apiClient';
import { refundEscrowWithWallet, releaseEscrowWithWallet } from '@/lib/escrow-transactions';
import { isSpendableEscrowRecordReference, normalizeEscrowRecordId } from '@/lib/escrow-record-reference';

interface EscrowActionPanelProps {
  escrowId: string;
  escrowRecordId?: string;
  status: 'locked' | 'released' | 'refunded';
  aleoAddress: string;
  payeeAddress?: string;
  completionProofField?: string;
  canRelease?: boolean;
  releaseBlockedReason?: string;
  onSyncEscrowRecord?: (escrowId: string) => Promise<string | void> | string | void;
  onStatusChange?: (newStatus: 'locked' | 'released' | 'refunded') => void;
}

interface EscrowActionResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export function EscrowActionPanel({
  escrowId,
  escrowRecordId,
  status,
  aleoAddress,
  payeeAddress,
  completionProofField,
  canRelease = true,
  releaseBlockedReason,
  onSyncEscrowRecord,
  onStatusChange,
}: EscrowActionPanelProps) {
  const { executeTransaction, transactionStatus, requestRecords } = useWallet();
  const rawEscrowRecordId = String(escrowRecordId || '').trim();
  const normalizedEscrowRecordId = normalizeEscrowRecordId(rawEscrowRecordId);
  const looksLikeOpaqueObjectReference =
    rawEscrowRecordId.startsWith('{') &&
    rawEscrowRecordId.includes('"id"') &&
    (rawEscrowRecordId.includes('"tag"') || rawEscrowRecordId.toLowerCase().includes('"record"'));
  const hasEscrowRecord = Boolean(rawEscrowRecordId);
  const hasSpendableEscrowRecord = isSpendableEscrowRecordReference(rawEscrowRecordId);
  const hasInvalidEscrowReference =
    Boolean(rawEscrowRecordId) &&
    !hasSpendableEscrowRecord &&
    !normalizedEscrowRecordId &&
    !looksLikeOpaqueObjectReference;
  const canAttemptEscrowAction = hasEscrowRecord || Boolean(onSyncEscrowRecord);
  const [loading, setLoading] = useState<'release' | 'refund' | null>(null);
  const [syncingRecord, setSyncingRecord] = useState(false);
  const [txModal, setTxModal] = useState<{
    open: boolean;
    txId?: string;
    type?: 'release' | 'refund';
    success?: boolean;
  }>({ open: false });

  const runEscrowAction = async (type: 'release' | 'refund') => {
    if (status !== 'locked') return;

    if (type === 'release' && !canRelease) {
      window.alert(releaseBlockedReason || 'Release is disabled until seeker proof is verified.');
      return;
    }

    if (type === 'refund') {
      const confirmed = window.confirm('Refund this escrow payment? This cannot be undone.');
      if (!confirmed) return;
    }

    setLoading(type);

    try {
      let effectiveEscrowRecordId = rawEscrowRecordId || normalizedEscrowRecordId;
      if (!effectiveEscrowRecordId && onSyncEscrowRecord) {
        setSyncingRecord(true);
        const syncedRecord = await onSyncEscrowRecord(escrowId);
        const syncedRawRecordId = String(syncedRecord || '').trim();
        effectiveEscrowRecordId = syncedRawRecordId || normalizeEscrowRecordId(syncedRawRecordId);
      }

      if (!effectiveEscrowRecordId) {
        throw new Error('Escrow record is missing or invalid. Click Sync Escrow Record, approve wallet record sharing, then retry.');
      }

      const executeWalletAction = async (recordId: string) => (
        type === 'release'
          ? releaseEscrowWithWallet(
              executeTransaction,
              transactionStatus,
              requestRecords,
              aleoAddress,
              recordId,
              String(payeeAddress || ''),
              String(completionProofField || '')
            )
          : refundEscrowWithWallet(
              executeTransaction,
              transactionStatus,
              requestRecords,
              aleoAddress,
              recordId,
              0
            )
      );

      let walletResult = await executeWalletAction(effectiveEscrowRecordId);
      const walletErrorText = String(walletResult.error || '').toLowerCase();
      const shouldRetryWithSync =
        !walletResult.success &&
        walletErrorText.includes('no spendable escrow record found') &&
        Boolean(onSyncEscrowRecord);

      if (shouldRetryWithSync && onSyncEscrowRecord) {
        setSyncingRecord(true);
        const syncedRecord = await onSyncEscrowRecord(escrowId);
        const syncedRawRecordId = String(syncedRecord || '').trim();
        const retriedRecordId =
          syncedRawRecordId ||
          normalizeEscrowRecordId(syncedRawRecordId) ||
          effectiveEscrowRecordId;
        if (retriedRecordId) {
          walletResult = await executeWalletAction(retriedRecordId);
          effectiveEscrowRecordId = retriedRecordId;
        }
      }

      if (!walletResult.success || !walletResult.transactionId) {
        throw new Error(walletResult.error || `Failed to submit ${type} transaction in wallet`);
      }

      const body = {
        escrowId,
        aleoAddress,
        transactionId: walletResult.transactionId,
        refundReason: 0,
      };

      let data: EscrowActionResponse;

      try {
        data = await apiRequest<EscrowActionResponse>(`/api/aleo/escrow/${type}`, {
          method: 'POST',
          body,
        });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          data = await apiRequest<EscrowActionResponse>(`/api/escrows/${escrowId}/${type}`, {
            method: 'POST',
            body,
          });
        } else {
          throw error;
        }
      }

      if (!data.success) {
        throw new Error(data.error || `Failed to ${type} escrow`);
      }

      setTxModal({
        open: true,
        txId: data.transactionId || walletResult.transactionId,
        type,
        success: true,
      });

      onStatusChange?.(type === 'release' ? 'released' : 'refunded');
    } catch (error: any) {
      console.error(`[EscrowActionPanel] ${type} failed:`, error);
      if (error?.message) {
        window.alert(error.message);
      }
      setTxModal({
        open: true,
        type,
        success: false,
      });
    } finally {
      setSyncingRecord(false);
      setLoading(null);
    }
  };

  const syncEscrowRecord = async () => {
    if (!onSyncEscrowRecord) return;
    setSyncingRecord(true);
    try {
      await onSyncEscrowRecord(escrowId);
      onStatusChange?.('locked');
    } catch (error) {
      console.error('[EscrowActionPanel] Failed to sync escrow record:', error);
    } finally {
      setSyncingRecord(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-text">Escrow Status</h3>
          <EscrowStatusBadge status={status} />
        </div>

        {status === 'locked' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runEscrowAction('release')}
              disabled={loading !== null || !canAttemptEscrowAction || !canRelease || !payeeAddress}
              size="sm"
            >
              {loading === 'release' ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              Release
            </Button>
            <Button onClick={() => runEscrowAction('refund')} disabled={loading !== null || !canAttemptEscrowAction} variant="outline" size="sm">
              {loading === 'refund' ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
              Refund
            </Button>
            {!hasEscrowRecord && (
              <div className="w-full space-y-2">
                <p className="text-xs text-amber-300">
                  {hasInvalidEscrowReference
                    ? 'Escrow record reference is invalid. Sync to recover a spendable wallet record, then retry release/refund.'
                    : 'Escrow record reference is missing. Sync to recover it (legacy rows may be re-locked on-chain), then retry release/refund.'}
                </p>
                {onSyncEscrowRecord && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={syncingRecord || loading !== null}
                    onClick={syncEscrowRecord}
                  >
                    {syncingRecord ? <Loader2 className="animate-spin" size={14} /> : 'Sync Escrow Record'}
                  </Button>
                )}
              </div>
            )}
            {(canRelease === false || !payeeAddress) && (
              <p className="w-full text-xs text-amber-300">
                {releaseBlockedReason || (!payeeAddress
                  ? 'Release is disabled until a seeker is accepted for this escrow.'
                  : 'Release is disabled until seeker work proof is verified.')}
              </p>
            )}
          </div>
        ) : status === 'released' ? (
          <div className="inline-flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 size={14} />
            Escrow released to freelancer.
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-amber-300">
            <XCircle size={14} />
            Escrow refunded to giver.
          </div>
        )}
      </div>

      <TransactionModal
        open={txModal.open}
        onClose={() => setTxModal({ open: false })}
        transactionId={txModal.txId}
        type={txModal.type}
        success={txModal.success}
      />
    </>
  );
}
