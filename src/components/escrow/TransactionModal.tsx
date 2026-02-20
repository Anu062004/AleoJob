// Transaction Modal Component
// Shows transaction status and link to Aleo explorer

'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactionId?: string;
  type?: 'release' | 'refund' | 'create';
  success?: boolean;
}

export function TransactionModal({
  open,
  onClose,
  transactionId,
  type = 'create',
  success = false,
}: TransactionModalProps) {
  const explorerUrl = transactionId
    ? `https://explorer.aleo.org/transaction/${transactionId}`
    : 'https://explorer.aleo.org';

  const getTitle = () => {
    if (!success) return 'Transaction Failed';
    switch (type) {
      case 'release':
        return 'Payment Released';
      case 'refund':
        return 'Payment Refunded';
      case 'create':
        return 'Escrow Created';
      default:
        return 'Transaction Complete';
    }
  };

  const getMessage = () => {
    if (!success) {
      return 'The transaction could not be completed. Please try again or contact support.';
    }
    switch (type) {
      case 'release':
        return 'The payment has been successfully released to the freelancer.';
      case 'refund':
        return 'The payment has been successfully refunded to your account.';
      case 'create':
        return 'The escrow has been successfully created and locked.';
      default:
        return 'Transaction completed successfully.';
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={getTitle()}>
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          {success ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-300" />
          ) : (
            <XCircle className="h-16 w-16 text-red-300" />
          )}
        </div>

        <p className="text-center text-brand-text-muted">{getMessage()}</p>

        {transactionId && (
          <div className="rounded-xl border border-brand-border bg-brand-surface-elevated p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="mb-1 text-sm text-brand-text-muted">Transaction ID</p>
                <p className="truncate font-mono text-xs text-brand-text">{transactionId}</p>
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 text-brand-secondary transition-colors hover:text-brand-text"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {transactionId && (
          <Button
            variant="outline"
            onClick={() => window.open(explorerUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </Button>
          )}
          <Button
            onClick={onClose}
            variant="primary"
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}







