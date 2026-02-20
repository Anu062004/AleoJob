import { ApiRequestError, apiRequest } from './apiClient';
import { createSupabaseClientWithToken } from './supabaseClient';

export type AccessRole = 'seeker' | 'giver';
export type AccessProofSource = 'record' | 'transaction' | 'none';

interface AccessVerificationRequest {
  aleoAddress: string;
  role: AccessRole;
  transactionId?: string;
}

interface AccessVerificationResponse {
  success: boolean;
  data?: AccessVerificationData;
  error?: string;
}

export interface AccessVerificationData {
  aleoAddress: string;
  role: AccessRole;
  hasAccess: boolean;
  proofVerified: boolean;
  source: AccessProofSource;
  proofReference: string;
  matchingRecordCount: number;
  transaction: {
    id: string;
    status: string;
    verified: boolean;
    source: 'provided' | 'cache' | 'none';
  } | null;
  warnings?: {
    records?: string;
    transaction?: string;
  };
}

const ACCESS_TX_CACHE_PREFIX = 'aleojob:access_tx';
const FAILED_ACCESS_TX_STATUSES = new Set(['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid']);
let accessApiUnavailable = false;

function getAccessTxCacheKey(aleoAddress: string, role: AccessRole): string {
  return `${ACCESS_TX_CACHE_PREFIX}:${role}:${aleoAddress}`;
}

function readCachedAccessTx(aleoAddress: string, role: AccessRole): string {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(getAccessTxCacheKey(aleoAddress, role)) || '').trim();
  } catch {
    return '';
  }
}

function writeCachedAccessTx(aleoAddress: string, role: AccessRole, transactionId?: string): void {
  const value = (transactionId || '').trim();
  if (!value || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getAccessTxCacheKey(aleoAddress, role), value);
  } catch {
    // Non-blocking cache write.
  }
}

function shouldFallbackToClientVerification(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;

  if (error.status === 404) return true;
  if (error.status && error.status >= 500) return true;

  const message = (error.message || '').toLowerCase();
  return (
    message.includes('unable to reach api server') ||
    message.includes('route not found') ||
    message.includes('internal server error')
  );
}

function isFailedAccessTransactionStatus(status: string): boolean {
  return FAILED_ACCESS_TX_STATUSES.has((status || '').trim().toLowerCase());
}

function withProvisionalAccess(
  base: AccessVerificationData,
  transactionId: string,
  source: 'provided' | 'cache',
  warning: string
): AccessVerificationData {
  const status = String(base.transaction?.status || 'unknown').trim().toLowerCase() || 'unknown';

  return {
    ...base,
    hasAccess: true,
    source: base.source === 'none' ? 'transaction' : base.source,
    proofReference: base.proofReference || `tx:${transactionId}`,
    transaction: {
      id: (base.transaction?.id || transactionId).trim(),
      status,
      verified: base.transaction?.verified || false,
      source,
    },
    warnings: {
      ...(base.warnings || {}),
      transaction: base.warnings?.transaction
        ? `${base.warnings.transaction} | ${warning}`
        : warning,
    },
  };
}

function buildFallbackNoAccess(
  request: AccessVerificationRequest,
  transactionId: string,
  warning: string
): AccessVerificationData {
  return {
    aleoAddress: request.aleoAddress,
    role: request.role,
    hasAccess: false,
    proofVerified: false,
    source: 'none',
    proofReference: transactionId ? `tx:${transactionId}` : '',
    matchingRecordCount: 0,
    transaction: transactionId
      ? {
          id: transactionId,
          status: 'unknown',
          verified: false,
          source: request.transactionId ? 'provided' : 'cache',
        }
      : null,
    warnings: {
      transaction: warning,
    },
  };
}

async function fallbackVerifyAccess(
  request: AccessVerificationRequest,
  transactionId: string,
  warning: string
): Promise<AccessVerificationData> {
  try {
    const client = createSupabaseClientWithToken(request.aleoAddress);
    const { data, error } = await client
      .from('access_payments')
      .select('transaction_id, transaction_status, proof_verified, has_access, proof_reference')
      .eq('aleo_address', request.aleoAddress)
      .eq('role', request.role)
      .single();

    if (!error && data) {
      const resolvedTx = (data.transaction_id || transactionId || '').trim();
      if (resolvedTx) {
        writeCachedAccessTx(request.aleoAddress, request.role, resolvedTx);
      }

      const hasAccess = Boolean(data.has_access);
      const proofVerified = Boolean(data.proof_verified);
      const transactionStatus = String(data.transaction_status || 'unknown');
      const source: AccessProofSource = hasAccess ? 'transaction' : 'none';
      const txSource: 'provided' | 'cache' = request.transactionId ? 'provided' : 'cache';

      const resolved: AccessVerificationData = {
        aleoAddress: request.aleoAddress,
        role: request.role,
        hasAccess,
        proofVerified,
        source,
        proofReference:
          (typeof data.proof_reference === 'string' && data.proof_reference.trim()) ||
            (resolvedTx ? `tx:${resolvedTx}` : ''),
        matchingRecordCount: 0,
        transaction: resolvedTx
          ? {
              id: resolvedTx,
              status: transactionStatus,
              verified: proofVerified,
              source: txSource,
            }
          : null,
        warnings: {
          transaction: warning,
        },
      };

      if (!resolved.hasAccess && resolvedTx && !isFailedAccessTransactionStatus(transactionStatus)) {
        return withProvisionalAccess(
          resolved,
          resolvedTx,
          txSource,
          'Provisional access granted while Aleo indexer syncs this payment transaction.'
        );
      }

      return resolved;
    }
  } catch {
    // Ignore fallback query failure and continue to local fallback behavior.
  }

  // If the API is unavailable but we have a transaction ID, keep flows unblocked in client mode.
  if (transactionId) {
    writeCachedAccessTx(request.aleoAddress, request.role, transactionId);
    return {
      aleoAddress: request.aleoAddress,
      role: request.role,
      hasAccess: true,
      proofVerified: true,
      source: 'transaction',
      proofReference: `tx:${transactionId}`,
      matchingRecordCount: 0,
      transaction: {
        id: transactionId,
        status: 'unknown',
        verified: true,
        source: request.transactionId ? 'provided' : 'cache',
      },
      warnings: {
        transaction: warning,
      },
    };
  }

  return buildFallbackNoAccess(request, transactionId, warning);
}

export async function verifyAccessOnChain(
  request: AccessVerificationRequest
): Promise<AccessVerificationData> {
  const providedTx = (request.transactionId || '').trim();
  if (providedTx) {
    writeCachedAccessTx(request.aleoAddress, request.role, providedTx);
  }

  const cachedTx = readCachedAccessTx(request.aleoAddress, request.role);
  const effectiveTx = providedTx || cachedTx;
  const requestBody: AccessVerificationRequest = {
    ...request,
    transactionId: effectiveTx || undefined,
  };

  if (!accessApiUnavailable) {
    try {
      const response = await apiRequest<AccessVerificationResponse>('/api/access/verify', {
        method: 'POST',
        body: requestBody,
      });

      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Access verification failed');
      }

      let resolved = response.data;
      const provisionalTxId = (effectiveTx || resolved.transaction?.id || '').trim();
      if (!resolved.hasAccess && provisionalTxId) {
        const status = String(resolved.transaction?.status || 'unknown').toLowerCase();
        if (!isFailedAccessTransactionStatus(status)) {
          const provisionalSource: 'provided' | 'cache' =
            resolved.transaction?.source === 'provided' || resolved.transaction?.source === 'cache'
              ? resolved.transaction.source
              : providedTx
                ? 'provided'
                : 'cache';

          resolved = withProvisionalAccess(
            resolved,
            provisionalTxId,
            provisionalSource,
            'Provisional access granted while Aleo indexer syncs this payment transaction.'
          );
        }
      }

      if (resolved.transaction?.id) {
        writeCachedAccessTx(request.aleoAddress, request.role, resolved.transaction.id);
      }

      return resolved;
    } catch (error) {
      if (!shouldFallbackToClientVerification(error)) {
        throw error;
      }
      accessApiUnavailable = true;
      return fallbackVerifyAccess(
        requestBody,
        effectiveTx,
        'Access API unavailable; used client-side fallback verification.'
      );
    }
  }

  return fallbackVerifyAccess(
    requestBody,
    effectiveTx,
    'Access API unavailable; used client-side fallback verification.'
  );
}

export function getAccessProofHash(verification: AccessVerificationData): string {
  if (verification.proofReference?.trim()) {
    return verification.proofReference.trim();
  }

  if (verification.transaction?.id) {
    return `tx:${verification.transaction.id}`;
  }

  return `proof:unknown:${Date.now()}`;
}
