// Escrow Action Panel Component
// Provides release and refund buttons for escrow management

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import { TransactionModal } from './TransactionModal';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface EscrowActionPanelProps {
  escrowId: string;
  status: 'locked' | 'released' | 'refunded';
  employerPrivateKey: string;
  aleoAddress: string;
  onStatusChange?: (newStatus: 'locked' | 'released' | 'refunded') => void;
}

export function EscrowActionPanel({
  escrowId,
  status,
  employerPrivateKey,
  aleoAddress,
  onStatusChange,
}: EscrowActionPanelProps) {
  const [loading, setLoading] = useState<'release' | 'refund' | null>(null);
  const [txModal, setTxModal] = useState<{
    open: boolean;
    txId?: string;
    type?: 'release' | 'refund';
    success?: boolean;
  }>({ open: false });

  const handleRelease = async () => {
    if (status !== 'locked') return;

    // Get private key if not provided
    let privateKey = employerPrivateKey;
    if (!privateKey) {
      const input = prompt(
        'Enter your Aleo private key to release payment:\n\n' +
        '⚠️ This is temporary. In production, this will use wallet signing.'
      );
      if (!input) {
        return;
      }
      privateKey = input;
    }

    setLoading('release');
    try {
      const response = await fetch('/api/aleo/escrow/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escrowId,
          employerPrivateKey: privateKey,
          aleoAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTxModal({
          open: true,
          txId: data.transactionId,
          type: 'release',
          success: true,
        });
        onStatusChange?.('released');
      } else {
        setTxModal({
          open: true,
          type: 'release',
          success: false,
        });
      }
    } catch (error: any) {
      console.error('Release payment error:', error);
      setTxModal({
        open: true,
        type: 'release',
        success: false,
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRefund = async () => {
    if (status !== 'locked') return;

    if (!confirm('Are you sure you want to refund this payment? This action cannot be undone.')) {
      return;
    }

    // Get private key if not provided
    let privateKey = employerPrivateKey;
    if (!privateKey) {
      const input = prompt(
        'Enter your Aleo private key to refund payment:\n\n' +
        '⚠️ This is temporary. In production, this will use wallet signing.'
      );
      if (!input) {
        return;
      }
      privateKey = input;
    }

    setLoading('refund');
    try {
      const response = await fetch('/api/aleo/escrow/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escrowId,
          employerPrivateKey: privateKey,
          aleoAddress,
          refundReason: 0, // 0 = cancellation
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTxModal({
          open: true,
          txId: data.transactionId,
          type: 'refund',
          success: true,
        });
        onStatusChange?.('refunded');
      } else {
        setTxModal({
          open: true,
          type: 'refund',
          success: false,
        });
      }
    } catch (error: any) {
      console.error('Refund payment error:', error);
      setTxModal({
        open: true,
        type: 'refund',
        success: false,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-dark">Escrow Status</h3>
          <EscrowStatusBadge status={status} />
        </div>

        <div className="space-y-3">
          {status === 'locked' && (
            <>
              <Button
                onClick={handleRelease}
                disabled={loading !== null}
                variant="primary"
                className="w-full rounded-full"
              >
                {loading === 'release' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Release Payment
                  </>
                )}
              </Button>

              <Button
                onClick={handleRefund}
                disabled={loading !== null}
                variant="outline"
                className="w-full rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                {loading === 'refund' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Refunding...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Refund Payment
                  </>
                )}
              </Button>
            </>
          )}

          {status === 'released' && (
            <div className="text-center py-4 text-text-secondary">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm">Payment has been released to the freelancer.</p>
            </div>
          )}

          {status === 'refunded' && (
            <div className="text-center py-4 text-text-secondary">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-sm">Payment has been refunded to you.</p>
            </div>
          )}
        </div>
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


