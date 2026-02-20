import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { transferCredits } from '@/lib/credit-transfer';
import { getAccessProofHash, verifyAccessOnChain } from '@/lib/accessVerification';
import { createEscrowWithWallet, createJobEscrowWithWallet, toAleoField } from '@/lib/escrow-transactions';
import { createSupabaseClientWithToken } from '@/lib/supabaseClient';
import { ApiRequestError, apiRequest } from '@/lib/apiClient';
import { EmptyState } from '@/components/web3/EmptyState';
import { GiverDashboard, GiverJobRow } from '@/components/web3/GiverDashboard';
import { Button } from '@/components/ui/Button';
import { EscrowActionPanel } from '@/components/escrow/EscrowActionPanel';
import { fetchMarketplaceProfile } from '@/lib/profileRole';
import {
  isSpendableEscrowRecordReference,
  normalizeEscrowRecordReference,
} from '@/lib/escrow-record-reference';
import { ALEO_CONFIG } from '../../lib/aleo-config';

interface Application {
  id: string;
  seeker_id: string;
  status: string;
  created_at: string;
  work_proof_status?: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  work_proof_hash?: string | null;
  work_proof_tx?: string | null;
  work_proof_notes?: string | null;
  work_proof_submitted_at?: string | null;
  seeker?: {
    aleo_address: string;
    name: string | null;
    skills: string[];
    profile_score: number;
  };
}

interface Escrow {
  id: string;
  status: 'locked' | 'released' | 'refunded';
  amount: number;
  freelancer_id: string | null;
  escrow_record_id?: string | null;
  create_tx?: string;
  release_tx?: string;
  refund_tx?: string;
  created_at?: string;
  updated_at?: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budget: string;
  is_active: boolean;
  created_at: string;
  payment_status?: 'pending' | 'locked' | 'completed' | 'refunded';
  applications?: Application[];
  escrows?: Escrow[];
}

interface AcceptResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    escrow?: {
      id?: string;
      transactionId?: string;
      amount?: number;
    };
  };
}

interface CreateJobResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    job?: {
      id?: string;
      title?: string;
      budget?: string;
      created_at?: string;
    };
  };
}

interface WorkProofActionResponse {
  success: boolean;
  error?: string;
  data?: {
    applicationId?: string;
    workProofStatus?: string;
    transactionId?: string;
  };
}

interface GiverJobsResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    jobs?: Job[];
  };
}

function normalizeList<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizeJobRelations(rawJob: any): Job {
  return {
    ...(rawJob || {}),
    applications: normalizeList<Application>(rawJob?.applications),
    escrows: normalizeList<Escrow>(rawJob?.escrows),
  } as Job;
}

function decodeProofUrl(notes: unknown): string {
  const text = typeof notes === 'string' ? notes.trim() : '';
  if (!text) return '';
  if (text.toLowerCase().startsWith('url:')) {
    return text.slice(4).trim();
  }
  return '';
}

const ESCROW_RECORD_FIELD_KEYS = [
  'owner',
  'payer',
  'payee',
  'amount',
  'job_id',
  'status',
  '_nonce',
] as const;

interface ReputationResponse {
  success: boolean;
  data?: {
    score?: number;
    metrics?: {
      jobsPosted?: number;
      totalEscrowGenerated?: number;
    };
  };
}

const initialForm = {
  title: '',
  description: '',
  skills: '',
  budgetMin: '',
  budgetMax: '',
};

const FAILED_TX_STATUSES = new Set(['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid']);
const ONCHAIN_TX_ID_PATTERN = /^at1[0-9a-z]+$/i;
const FIELD_TOKEN_PATTERN = /^[0-9]+field$/i;

function toSeekerAlias(aleoAddress?: string | null): string {
  const value = String(aleoAddress || '').trim();
  if (!value) return 'Anonymous Seeker';
  if (value.length <= 14) return `Seeker ${value}`;
  return `Seeker ${value.slice(0, 6)}...${value.slice(-4)}`;
}

function parseBudgetMax(budget: string): number | undefined {
  const matches = budget?.match(/\d+/g);
  if (!matches || matches.length === 0) return undefined;
  if (matches.length === 1) return Number(matches[0]);
  return Number(matches[matches.length - 1]);
}

function normalizeAddress(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isOnchainTransactionId(value: unknown): boolean {
  return ONCHAIN_TX_ID_PATTERN.test(String(value || '').trim());
}

function toCleanString(value: unknown): string {
  return String(value || '').trim();
}

function listAcceptedApplications(job?: Job): Application[] {
  return normalizeList(job?.applications)
    .filter((application) => application.status === 'accepted')
    .sort((a, b) => {
      const aTs = Number(new Date(a?.created_at || 0));
      const bTs = Number(new Date(b?.created_at || 0));
      return bTs - aTs;
    });
}

function scoreLockedEscrowCandidate(
  escrow: Escrow,
  acceptedApplications: Application[],
  preferredSeekerId?: string
): number {
  const normalizedFreelancerId = toCleanString(escrow.freelancer_id);
  const normalizedPreferredSeekerId = toCleanString(preferredSeekerId);
  const acceptedSeekerIds = new Set(
    acceptedApplications.map((application) => toCleanString(application.seeker_id)).filter(Boolean)
  );
  const hasUsableRecordRef = isSpendableEscrowRecordReference(escrow.escrow_record_id);
  const hasOnchainCreateTx = isOnchainTransactionId(escrow.create_tx);
  const hasCreateTx = Boolean(toCleanString(escrow.create_tx));

  let score = 0;
  if (hasUsableRecordRef) score += 500;
  if (hasOnchainCreateTx) score += 220;
  else if (hasCreateTx) score += 80;
  if (Number(escrow.amount || 0) > 0) score += 20;

  if (normalizedPreferredSeekerId) {
    if (normalizedFreelancerId === normalizedPreferredSeekerId) score += 400;
    else if (!normalizedFreelancerId) score += 120;
    else score -= 180;
  } else {
    if (normalizedFreelancerId && acceptedSeekerIds.has(normalizedFreelancerId)) score += 240;
    else if (normalizedFreelancerId) score -= 120;
    else if (acceptedApplications.length > 0) score += 60;
  }

  return score;
}

function selectBestLockedEscrow(job?: Job, preferredSeekerId?: string): Escrow | undefined {
  const lockedEscrows = normalizeList(job?.escrows).filter((escrow) => escrow.status === 'locked');
  if (!lockedEscrows.length) return undefined;
  if (lockedEscrows.length === 1) return lockedEscrows[0];

  const acceptedApplications = listAcceptedApplications(job);
  const ranked = lockedEscrows
    .map((escrow, index) => ({
      escrow,
      index,
      score: scoreLockedEscrowCandidate(escrow, acceptedApplications, preferredSeekerId),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const amountDelta = Number(b.escrow.amount || 0) - Number(a.escrow.amount || 0);
      if (amountDelta !== 0) return amountDelta;
      const aTs = Number(new Date(a.escrow.updated_at || a.escrow.created_at || 0));
      const bTs = Number(new Date(b.escrow.updated_at || b.escrow.created_at || 0));
      if (bTs !== aTs) return bTs - aTs;
      return a.index - b.index;
    });

  return ranked[0]?.escrow;
}

function selectAcceptedApplicationForEscrow(job: Job, escrow?: Escrow): Application | undefined {
  const acceptedApplications = listAcceptedApplications(job);
  if (!acceptedApplications.length) return undefined;

  const freelancerId = toCleanString(escrow?.freelancer_id);
  if (freelancerId) {
    const matched = acceptedApplications.find((application) => toCleanString(application.seeker_id) === freelancerId);
    if (matched) return matched;
  }

  return acceptedApplications[0];
}

function selectPrimaryEscrowForJob(job?: Job): Escrow | undefined {
  const preferredLocked = selectBestLockedEscrow(job);
  if (preferredLocked) return preferredLocked;

  const escrows = normalizeList(job?.escrows);
  const withUsableReference = escrows.find((escrow) => isSpendableEscrowRecordReference(escrow.escrow_record_id));
  if (withUsableReference) return withUsableReference;

  return escrows[0];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function parseNumberToken(value: string, suffix: 'u64' | 'u8'): number | undefined {
  const normalized = value.trim().toLowerCase().replace(/["']/g, '');
  const token = normalized.endsWith(suffix) ? normalized.slice(0, -suffix.length) : normalized;
  const numeric = Number(token.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseAddressFromUnknown(input: unknown): string {
  if (typeof input === 'string') {
    const match = input.match(/aleo1[0-9a-z]+/i);
    return match?.[0] || '';
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const parsed = parseAddressFromUnknown(item);
      if (parsed) return parsed;
    }
    return '';
  }

  if (input && typeof input === 'object') {
    const value = input as Record<string, unknown>;
    for (const nested of Object.values(value)) {
      const parsed = parseAddressFromUnknown(nested);
      if (parsed) return parsed;
    }
  }

  return '';
}

function parseNumericFromUnknown(input: unknown): number | undefined {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.floor(input) : undefined;
  }

  if (typeof input === 'string') {
    const withSuffix = input.match(/([0-9][0-9_,]*)u(64|8)/i);
    if (withSuffix?.[1]) {
      const parsed = Number(withSuffix[1].replace(/[,_]/g, ''));
      return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
    }
    const plain = input.match(/([0-9][0-9_,]*)/);
    if (plain?.[1]) {
      const parsed = Number(plain[1].replace(/[,_]/g, ''));
      return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
    }
    return undefined;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const parsed = parseNumericFromUnknown(item);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  }

  if (input && typeof input === 'object') {
    const value = input as Record<string, unknown>;
    const preferredKeys = ['private', 'public', 'value', 'microcredits', 'amount', 'status'];
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = parseNumericFromUnknown(value[key]);
        if (parsed !== undefined) return parsed;
      }
    }
    for (const nested of Object.values(value)) {
      const parsed = parseNumericFromUnknown(nested);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
}

function collectFieldValues(input: unknown, fieldName: string, collector: unknown[] = []): unknown[] {
  if (!input || !fieldName) return collector;

  if (Array.isArray(input)) {
    for (const item of input) {
      collectFieldValues(item, fieldName, collector);
    }
    return collector;
  }

  if (input && typeof input === 'object') {
    const value = input as Record<string, unknown>;
    for (const [key, nested] of Object.entries(value)) {
      if (key.toLowerCase() === fieldName.toLowerCase()) {
        collector.push(nested);
      }
      if (nested && typeof nested === 'object') {
        collectFieldValues(nested, fieldName, collector);
      }
    }
  }

  return collector;
}

function readRecordField(raw: string, field: string): string {
  const patterns = [
    new RegExp(`${field}\\s*:\\s*([^,}\\n]+)`, 'i'),
    new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, 'i'),
    new RegExp(`"${field}"\\s*:\\s*([^,}\\n]+)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const fieldValues = collectFieldValues(parsed, field);
      for (const value of fieldValues) {
        if (field === 'owner' || field === 'payer' || field === 'payee') {
          const parsedAddress = parseAddressFromUnknown(value);
          if (parsedAddress) return parsedAddress;
        } else {
          const parsedNumber = parseNumericFromUnknown(value);
          if (parsedNumber !== undefined) return String(parsedNumber);
        }
      }
    } catch {
      // no-op
    }
  }

  return '';
}

function collectRecordLikeStrings(input: unknown, collector: Set<string> = new Set()): Set<string> {
  if (!input) return collector;

  if (typeof input === 'string') {
    const value = input.trim();
    if (!value) return collector;

    const lower = value.toLowerCase();
    if (
      lower.startsWith('record1') ||
      lower.includes('paymentescrow') ||
      lower.includes('job_id') ||
      lower.includes('payee') ||
      lower.includes('payer') ||
      lower.includes('amount') ||
      lower.includes('status') ||
      lower.includes('_nonce')
    ) {
      collector.add(value);
    }
    return collector;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectRecordLikeStrings(item, collector);
    }
    return collector;
  }

  if (typeof input === 'object') {
    const objectValue = input as Record<string, unknown>;
    const keys = Object.keys(objectValue).map((key) => key.toLowerCase());
    const looksLikeEscrowObject =
      keys.includes('job_id') &&
      keys.includes('amount') &&
      keys.includes('status') &&
      (keys.includes('payer') || keys.includes('payee') || keys.includes('owner'));

    const recordType = toCleanString(
      (objectValue as any).type ||
      (objectValue as any).recordType ||
      (objectValue as any).record_type ||
      (objectValue as any).kind
    ).toLowerCase();
    const recordId = toCleanString((objectValue as any).id || (objectValue as any).record_id || (objectValue as any).recordId);
    const recordTag = toCleanString((objectValue as any).tag);
    const recordChecksum = toCleanString((objectValue as any).checksum);
    const looksLikeOpaqueReference =
      (recordType.includes('record') || keys.some((key) => key.includes('record'))) &&
      (
        FIELD_TOKEN_PATTERN.test(recordId) ||
        FIELD_TOKEN_PATTERN.test(recordTag) ||
        FIELD_TOKEN_PATTERN.test(recordChecksum)
      );

    if (looksLikeEscrowObject) {
      collector.add(JSON.stringify(objectValue));
    }
    if (looksLikeOpaqueReference) {
      collector.add(JSON.stringify(objectValue));
    }

    for (const [key, value] of Object.entries(objectValue)) {
      const lowerKey = key.toLowerCase();
      if (typeof value === 'string') {
        if (
          lowerKey.includes('record') ||
          lowerKey.includes('plaintext') ||
          lowerKey.includes('cipher') ||
          lowerKey === 'value' ||
          lowerKey === 'data' ||
          lowerKey === 'id' ||
          lowerKey === 'commitment' ||
          lowerKey === 'record_id' ||
          lowerKey === 'recordid' ||
          (ESCROW_RECORD_FIELD_KEYS as readonly string[]).includes(lowerKey)
        ) {
          collectRecordLikeStrings(value, collector);
        }
      } else {
        collectRecordLikeStrings(value, collector);
      }
    }
  }

  return collector;
}

function parseEscrowRecordCandidate(rawRecord: string) {
  const raw = rawRecord.trim();
  if (!raw) return null;

  const jobIdField = readRecordField(raw, 'job_id');
  const amountRaw = readRecordField(raw, 'amount');
  const payer = readRecordField(raw, 'payer');
  const payee = readRecordField(raw, 'payee');
  const owner = readRecordField(raw, 'owner');
  const statusRaw = readRecordField(raw, 'status');

  const amount = amountRaw ? parseNumberToken(amountRaw, 'u64') : undefined;
  const status = statusRaw ? parseNumberToken(statusRaw, 'u8') : undefined;

  return {
    raw,
    jobIdField: jobIdField || undefined,
    amount,
    payer: payer || undefined,
    payee: payee || undefined,
    owner: owner || undefined,
    status,
  };
}

function extractOnchainTxFromStatusResponse(input: unknown): string {
  if (!input || typeof input !== 'object') return '';

  const record = input as Record<string, unknown>;
  const candidates = [
    record.transactionId,
    record.transaction_id,
    record.txId,
    record.tx_id,
    record.id,
    (record.event as Record<string, unknown> | undefined)?.transactionId,
    (record.event as Record<string, unknown> | undefined)?.transaction_id,
    (record.event as Record<string, unknown> | undefined)?.id,
  ];

  for (const candidate of candidates) {
    const value = toCleanString(candidate);
    if (isOnchainTransactionId(value)) {
      return value;
    }
  }

  return '';
}

type ManualEscrowBinding = {
  escrowId: string;
  escrowRecordId?: string;
  createTx?: string;
};

function Giver() {
  const {
    connected,
    address,
    executeTransaction,
    transactionStatus,
    requestRecords,
    requestTransactionHistory,
  } = useWallet();
  const [roleStatus, setRoleStatus] = useState<'loading' | 'unassigned' | 'giver' | 'seeker'>('loading');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fetchingJobs, setFetchingJobs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [hasPostingAccess, setHasPostingAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessProofHash, setAccessProofHash] = useState('');
  const [giverReputation, setGiverReputation] = useState(0);
  const [giverMetrics, setGiverMetrics] = useState<{ jobsPosted: number; totalEscrowGenerated: number }>({
    jobsPosted: 0,
    totalEscrowGenerated: 0,
  });
  const [verifyingProofId, setVerifyingProofId] = useState<string | null>(null);
  const attemptedEscrowSyncRef = useRef<Set<string>>(new Set());
  const lastReconcileAtRef = useRef(0);
  const reconciliationInFlightRef = useRef(false);
  const escrowRecordCacheRef = useRef<{ fetchedAt: number; records: unknown[] } | null>(null);
  const escrowRecordFetchInFlightRef = useRef<Promise<unknown[]> | null>(null);

  const resolveOnchainTransactionId = useCallback(async (
    walletTransactionId: string,
    preferredPrograms: string[] = [ALEO_CONFIG.programs.escrow]
  ): Promise<string> => {
    const normalizedWalletTxId = toCleanString(walletTransactionId);
    if (!normalizedWalletTxId) return '';
    if (isOnchainTransactionId(normalizedWalletTxId)) return normalizedWalletTxId;

    if (transactionStatus) {
      try {
        const statusResponse = await transactionStatus(normalizedWalletTxId);
        const resolvedFromStatus = extractOnchainTxFromStatusResponse(statusResponse);
        if (resolvedFromStatus) {
          return resolvedFromStatus;
        }
      } catch (error) {
        console.warn('[Giver] transactionStatus failed while resolving local tx id:', error);
      }
    }

    if (!requestTransactionHistory) {
      return '';
    }

    const programIds = Array.from(
      new Set(
        preferredPrograms
          .map((programId) => toCleanString(programId))
          .filter(Boolean)
      )
    );

    for (const programId of programIds) {
      try {
        const historyResponse = await requestTransactionHistory(programId);
        const rows = Array.isArray((historyResponse as any)?.transactions)
          ? (historyResponse as any).transactions
          : [];

        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;

          const rowRecord = row as Record<string, unknown>;
          const eventRecord =
            rowRecord.event && typeof rowRecord.event === 'object'
              ? (rowRecord.event as Record<string, unknown>)
              : {};

          const localCandidates = [
            rowRecord.id,
            rowRecord.eventId,
            rowRecord.event_id,
            rowRecord.walletTransactionId,
            rowRecord.wallet_transaction_id,
            rowRecord.tempTransactionId,
            rowRecord.temp_transaction_id,
            eventRecord.id,
            eventRecord.eventId,
            eventRecord.event_id,
          ]
            .map(toCleanString)
            .filter(Boolean);

          const chainCandidates = [
            rowRecord.transactionId,
            rowRecord.transaction_id,
            rowRecord.txId,
            rowRecord.tx_id,
            rowRecord.hash,
            rowRecord.transactionHash,
            rowRecord.transaction_hash,
            rowRecord.onChainTransactionId,
            rowRecord.on_chain_transaction_id,
            eventRecord.transactionId,
            eventRecord.transaction_id,
            eventRecord.txId,
            eventRecord.tx_id,
            eventRecord.hash,
            rowRecord.id,
          ]
            .map(toCleanString)
            .filter(Boolean);

          const resolvedChainTx = chainCandidates.find((value) => isOnchainTransactionId(value));
          if (!resolvedChainTx) continue;

          const matchesLocalId =
            localCandidates.includes(normalizedWalletTxId) ||
            chainCandidates.includes(normalizedWalletTxId);

          if (matchesLocalId) {
            return resolvedChainTx;
          }
        }
      } catch (error) {
        console.warn(`[Giver] requestTransactionHistory failed for ${programId}:`, error);
      }
    }

    return '';
  }, [transactionStatus, requestTransactionHistory]);

  const resolveOnchainTransactionIdWithRetry = useCallback(async (
    walletTransactionId: string,
    preferredPrograms: string[] = [ALEO_CONFIG.programs.escrow],
    attempts = 6,
    waitMs = 1400
  ): Promise<string> => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const resolved = await resolveOnchainTransactionId(walletTransactionId, preferredPrograms);
      if (isOnchainTransactionId(resolved)) {
        return resolved;
      }
      if (attempt < attempts - 1) {
        await delay(waitMs);
      }
    }
    return '';
  }, [resolveOnchainTransactionId]);

  const findEscrowCreateTxFromHistory = useCallback(async (options: {
    payerAddress: string;
    payeeAddress?: string;
    amountCredits: number;
  }): Promise<string> => {
    if (!requestTransactionHistory) return '';

    const payer = toCleanString(options.payerAddress).toLowerCase();
    const payee = toCleanString(options.payeeAddress).toLowerCase();
    const amountCredits = Math.floor(Number(options.amountCredits || 0));
    if (!payer || amountCredits <= 0) return '';

    const amountMicrocredits = amountCredits * 1_000_000;
    const historyResponse = await requestTransactionHistory(ALEO_CONFIG.programs.escrow);
    const rows = Array.isArray((historyResponse as any)?.transactions)
      ? (historyResponse as any).transactions
      : [];

    const sortedRows = [...rows].sort((a: any, b: any) => {
      const aTime = Number(new Date(a?.createdAt || a?.created_at || a?.timestamp || 0));
      const bTime = Number(new Date(b?.createdAt || b?.created_at || b?.timestamp || 0));
      return bTime - aTime;
    });

    for (const row of sortedRows) {
      if (!row || typeof row !== 'object') continue;
      const text = JSON.stringify(row).toLowerCase();
      if (!text) continue;
      if (!text.includes('create_escrow') && !text.includes('create_job_escrow')) continue;
      if (!text.includes(payer)) continue;
      if (payee && !text.includes(payee)) continue;
      if (!text.includes(`${amountMicrocredits}u64`) && !text.includes(`${amountCredits}`)) continue;

      const rowRecord = row as Record<string, unknown>;
      const eventRecord =
        rowRecord.event && typeof rowRecord.event === 'object'
          ? (rowRecord.event as Record<string, unknown>)
          : {};

      const chainCandidates = [
        rowRecord.transactionId,
        rowRecord.transaction_id,
        rowRecord.txId,
        rowRecord.tx_id,
        rowRecord.hash,
        rowRecord.transactionHash,
        rowRecord.transaction_hash,
        rowRecord.onChainTransactionId,
        rowRecord.on_chain_transaction_id,
        eventRecord.transactionId,
        eventRecord.transaction_id,
        eventRecord.txId,
        eventRecord.tx_id,
        eventRecord.hash,
        rowRecord.id,
      ]
        .map(toCleanString)
        .filter(Boolean);

      const onchain = chainCandidates.find((value) => isOnchainTransactionId(value));
      if (onchain) return onchain;
    }

    return '';
  }, [requestTransactionHistory]);

  const loadEscrowProgramRecords = useCallback(async (forceRefresh = false): Promise<unknown[]> => {
    if (!requestRecords) return [];

    const cache = escrowRecordCacheRef.current;
    if (!forceRefresh && cache && (Date.now() - cache.fetchedAt) < 30000) {
      return cache.records;
    }

    if (!forceRefresh && escrowRecordFetchInFlightRef.current) {
      return escrowRecordFetchInFlightRef.current;
    }

    const escrowProgramId = ALEO_CONFIG.programs.escrow;
    const fetchPromise = (async () => {
      let records: unknown[] = [];
      try {
        records = await requestRecords(escrowProgramId, true);
      } catch {
        try {
          records = await requestRecords(escrowProgramId, false);
        } catch (error) {
          console.warn('[Giver] requestRecords failed for escrow program:', error);
          records = [];
        }
      }

      escrowRecordCacheRef.current = { fetchedAt: Date.now(), records };
      return records;
    })();

    escrowRecordFetchInFlightRef.current = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      escrowRecordFetchInFlightRef.current = null;
    }
  }, [requestRecords]);

  const recoverEscrowRecordFromWallet = useCallback(async (options: {
    jobId: string;
    amount: number;
    payerAddress: string;
    forceRefresh?: boolean;
  }): Promise<string> => {
    if (!requestRecords) return '';

    const normalizedJobId = toCleanString(options.jobId);
    const normalizedPayer = normalizeAddress(options.payerAddress);
    const normalizedAmount = Math.floor(Number(options.amount || 0));
    if (!normalizedJobId || !normalizedPayer || normalizedAmount <= 0) {
      return '';
    }

    const targetJobField = toAleoField(normalizedJobId).toLowerCase();
    const records = await loadEscrowProgramRecords(Boolean(options.forceRefresh));

    let bestMatch = '';
    let bestScore = -1;
    let matchCount = 0;

    for (const record of records || []) {
      const rawCandidates = Array.from(collectRecordLikeStrings(record));
      for (const rawCandidate of rawCandidates) {
        const parsed = parseEscrowRecordCandidate(rawCandidate);
        if (!parsed) continue;
        const parsedRecordId = normalizeEscrowRecordReference(parsed.raw);
        if (!parsedRecordId) continue;
        matchCount += 1;

        let score = 0;
        if (parsed.jobIdField && parsed.jobIdField.toLowerCase() === targetJobField) score += 6;
        if (
          parsed.amount !== undefined &&
          (parsed.amount === normalizedAmount || parsed.amount === normalizedAmount * 1_000_000)
        ) {
          score += 3;
        }
        if (parsed.payer && normalizeAddress(parsed.payer) === normalizedPayer) score += 2;
        if (parsed.owner && normalizeAddress(parsed.owner) === normalizedPayer) score += 1;
        if (parsed.status === undefined || parsed.status === 0) score += 1;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = parsedRecordId;
        }
      }
    }

    if (bestScore >= 6) {
      return bestMatch;
    }
    if (bestScore >= 3 && bestMatch) {
      return bestMatch;
    }
    if (matchCount === 1 && bestMatch) {
      return bestMatch;
    }

    return '';
  }, [requestRecords, loadEscrowProgramRecords]);

  const refreshPostingAccess = useCallback(async (transactionId?: string) => {
    if (!connected || !address) {
      setHasPostingAccess(false);
      setAccessProofHash('');
      return null;
    }

    setIsCheckingAccess(true);
    try {
      const verification = await verifyAccessOnChain({
        aleoAddress: address,
        role: 'giver',
        transactionId,
      });

      setHasPostingAccess(verification.hasAccess);
      setAccessProofHash(verification.hasAccess ? getAccessProofHash(verification) : '');
      return verification;
    } catch (error) {
      console.error('[Giver] Access verification failed:', error);
      if (transactionId) {
        setHasPostingAccess(true);
        setAccessProofHash(`tx:${transactionId}`);
      } else {
        setHasPostingAccess(false);
        setAccessProofHash('');
      }
      return null;
    } finally {
      setIsCheckingAccess(false);
    }
  }, [connected, address]);

  const refreshGiverReputation = useCallback(async () => {
    if (!address) return;

    try {
      const response = await apiRequest<ReputationResponse>('/api/reputation/recalculate', {
        method: 'POST',
        body: { aleoAddress: address },
      });

      if (response.success) {
        setGiverReputation(Number(response.data?.score || 0));
        setGiverMetrics({
          jobsPosted: Number(response.data?.metrics?.jobsPosted || 0),
          totalEscrowGenerated: Number(response.data?.metrics?.totalEscrowGenerated || 0),
        });
      }
    } catch (error) {
      console.warn('[Giver] Reputation refresh failed:', error);
    }
  }, [address]);

  const fetchJobs = useCallback(async () => {
    if (!address) return;

    try {
      setFetchingJobs(true);

      try {
        const apiResult = await apiRequest<GiverJobsResponse>('/api/giver/jobs', {
          method: 'POST',
          body: { aleoAddress: address },
          headers: {
            'x-aleo-address': address,
          },
        });

        if (apiResult.success && Array.isArray(apiResult.data?.jobs)) {
          setRoleStatus('giver');
          setJobs((apiResult.data?.jobs || []).map((job) => normalizeJobRelations(job)));
          return;
        }
      } catch (apiError) {
        console.warn('[Giver] Server jobs API unavailable, falling back to client query:', apiError);
      }

      const client = createSupabaseClientWithToken(address);

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, role')
        .eq('aleo_address', address)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        setRoleStatus('unassigned');
        setJobs([]);
        return;
      }

      if (profileError) throw profileError;
      if (profile.role !== 'giver') {
        setRoleStatus(profile.role === 'seeker' ? 'seeker' : 'unassigned');
        setJobs([]);
        return;
      }

      setRoleStatus('giver');

      const { data: jobsData, error: jobsError } = await client
        .from('jobs')
        .select(
          `
            *,
            applications (
              id,
              seeker_id,
              status,
              created_at,
              work_proof_status,
              work_proof_hash,
              work_proof_tx,
              work_proof_notes,
              work_proof_submitted_at,
              seeker:profiles!applications_seeker_id_fkey (
                aleo_address,
                skills,
                profile_score
              )
            ),
            escrows (
              id,
              status,
              amount,
              freelancer_id,
              escrow_record_id,
              create_tx,
              release_tx,
              refund_tx,
              created_at,
              updated_at
            )
          `
        )
        .eq('giver_id', profile.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs((jobsData || []).map((job: any) => normalizeJobRelations(job)));
    } catch (error) {
      console.error('[Giver] Failed to fetch jobs:', error);
    } finally {
      setFetchingJobs(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      attemptedEscrowSyncRef.current.clear();
      escrowRecordCacheRef.current = null;
      escrowRecordFetchInFlightRef.current = null;
      setRoleStatus('loading');
      void (async () => {
        try {
          const profile = await fetchMarketplaceProfile(address);

          if (!profile?.role) {
            setRoleStatus('unassigned');
            setJobs([]);
            setHasPostingAccess(false);
            setAccessProofHash('');
            return;
          }

          if (profile.role !== 'giver') {
            setRoleStatus('seeker');
            setJobs([]);
            setHasPostingAccess(false);
            setAccessProofHash('');
            return;
          }

          setRoleStatus('giver');
          await Promise.all([
            fetchJobs(),
            refreshPostingAccess(),
            refreshGiverReputation(),
          ]);
        } catch (error) {
          console.error('[Giver] Failed to initialize role state:', error);
          setRoleStatus('unassigned');
          setJobs([]);
          setHasPostingAccess(false);
          setAccessProofHash('');
        }
      })();
    } else {
      setRoleStatus('loading');
      setJobs([]);
      setHasPostingAccess(false);
      setAccessProofHash('');
      setGiverReputation(0);
      setGiverMetrics({ jobsPosted: 0, totalEscrowGenerated: 0 });
      setVerifyingProofId(null);
      attemptedEscrowSyncRef.current.clear();
      reconciliationInFlightRef.current = false;
      lastReconcileAtRef.current = 0;
      escrowRecordCacheRef.current = null;
      escrowRecordFetchInFlightRef.current = null;
    }
  }, [connected, address, fetchJobs, refreshPostingAccess, refreshGiverReputation]);

  const requestEscrowRecordSync = useCallback(async (escrowIds: string[], manualRecords: ManualEscrowBinding[] = []) => {
    if (!escrowIds.length || !address) return;

    try {
      await apiRequest('/api/escrows/sync-records', {
        method: 'POST',
        body: {
          escrowIds,
          manualRecords,
          limit: Math.max(escrowIds.length, manualRecords.length),
          aleoAddress: address,
        },
      });
    } catch (error) {
      console.warn('[Giver] Escrow record sync request failed:', error);
    }
  }, [address]);

  const requestTransactionReconcile = useCallback(async (escrowIds: string[]) => {
    if (!escrowIds.length || !address) return;

    try {
      await apiRequest('/api/transactions/reconcile', {
        method: 'POST',
        body: { escrowIds, limit: escrowIds.length, includeAccessPayments: false, aleoAddress: address },
      });
    } catch (error) {
      console.warn('[Giver] Transaction reconciliation request failed:', error);
    }
  }, [address]);

  const syncEscrowRecord = useCallback(async (escrowId: string) => {
    if (!address || !escrowId) return '';

    let manualBindings: ManualEscrowBinding[] = [];
    let relockMessage = '';
    let relockError = '';
    let recoveredRecordId = '';

    try {
      const client = createSupabaseClientWithToken(address);
      const { data: escrow, error: escrowError } = await client
        .from('escrows')
        .select('id, job_id, amount, create_tx, escrow_record_id')
        .eq('id', escrowId)
        .maybeSingle();

      const existingEscrowRecordId = normalizeEscrowRecordReference((escrow as any)?.escrow_record_id);
      const escrowNeedsRecordRepair = !isSpendableEscrowRecordReference(existingEscrowRecordId);

      if (!escrowError && escrow && escrowNeedsRecordRepair) {
        const escrowJobId = toCleanString((escrow as any).job_id);
        const escrowAmount = Number((escrow as any).amount || 0);
        const currentCreateTx = toCleanString(escrow.create_tx);
        const resolvedCreateTx = currentCreateTx
          ? await resolveOnchainTransactionIdWithRetry(currentCreateTx, [ALEO_CONFIG.programs.escrow], 4, 1200)
          : '';
        const normalizedResolvedCreateTx = isOnchainTransactionId(resolvedCreateTx) ? resolvedCreateTx : '';

        if (normalizedResolvedCreateTx && normalizedResolvedCreateTx !== currentCreateTx) {
          await client
            .from('escrows')
            .update({ create_tx: normalizedResolvedCreateTx, updated_at: new Date().toISOString() })
            .eq('id', escrowId);
        }

        const normalizedOnchainCreateTx =
          normalizedResolvedCreateTx || (isOnchainTransactionId(currentCreateTx) ? currentCreateTx : '');

        const recoveredEscrowRecord = await recoverEscrowRecordFromWallet({
          jobId: escrowJobId,
          amount: escrowAmount,
          payerAddress: address,
          forceRefresh: true,
        });

        let recoveredHistoryCreateTx = '';
        if (!recoveredEscrowRecord && !normalizedOnchainCreateTx) {
          try {
            const { data: acceptedApplication } = await client
              .from('applications')
              .select(`
                id,
                status,
                seeker:profiles!applications_seeker_id_fkey (
                  aleo_address
                )
              `)
              .eq('job_id', escrowJobId)
              .eq('status', 'accepted')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const acceptedSeekerAddress = toCleanString((acceptedApplication as any)?.seeker?.aleo_address);
            recoveredHistoryCreateTx = await findEscrowCreateTxFromHistory({
              payerAddress: address,
              payeeAddress: acceptedSeekerAddress || undefined,
              amountCredits: escrowAmount,
            });
          } catch (historyError) {
            console.warn('[Giver] Failed to recover escrow create tx from history:', historyError);
          }
        }

        if (recoveredEscrowRecord || normalizedOnchainCreateTx || recoveredHistoryCreateTx) {
          manualBindings = [{
            escrowId,
            escrowRecordId: recoveredEscrowRecord || undefined,
            createTx: normalizedOnchainCreateTx || recoveredHistoryCreateTx || undefined,
          }];
        }

        // Legacy recovery path:
        // if escrow still has no usable on-chain reference, lock funds now on v4 and bind the fresh record.
        const hasUsableBinding = Boolean(manualBindings[0]?.escrowRecordId || manualBindings[0]?.createTx);
        const canAttemptRelock =
          !hasUsableBinding &&
          !normalizedOnchainCreateTx &&
          Boolean(executeTransaction) &&
          Boolean(requestRecords) &&
          escrowJobId &&
          escrowAmount > 0;

        if (canAttemptRelock) {
          const { data: acceptedApplication } = await client
            .from('applications')
            .select(`
              id,
              seeker_id,
              status,
              seeker:profiles!applications_seeker_id_fkey (
                aleo_address
              )
            `)
            .eq('job_id', escrowJobId)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const acceptedSeekerAddress = toCleanString((acceptedApplication as any)?.seeker?.aleo_address);

          if (!acceptedSeekerAddress) {
            relockError =
              'This escrow has no accepted seeker yet. Accept a seeker first, then click Sync Escrow Record again.';
            await requestEscrowRecordSync([escrowId], manualBindings);
            await fetchJobs();
            if (relockError) {
              window.alert(relockError);
            }
            return '';
          }

          const relockResult = await createEscrowWithWallet(
            executeTransaction,
            transactionStatus,
            requestRecords,
            address,
            acceptedSeekerAddress,
            escrowJobId,
            escrowAmount
          );

          if (relockResult.success && relockResult.transactionId) {
            const walletTxId = relockResult.walletTransactionId || relockResult.transactionId;
            const resolvedRelockTx =
              (await resolveOnchainTransactionIdWithRetry(walletTxId, [ALEO_CONFIG.programs.escrow], 8, 1500)) ||
              relockResult.transactionId;
            const normalizedRelockTx = isOnchainTransactionId(resolvedRelockTx) ? resolvedRelockTx : '';
            let recoveredRelockedEscrowRecord = await recoverEscrowRecordFromWallet({
              jobId: escrowJobId,
              amount: escrowAmount,
              payerAddress: address,
              forceRefresh: true,
            });

            if (!recoveredRelockedEscrowRecord) {
              await delay(1800);
              recoveredRelockedEscrowRecord = await recoverEscrowRecordFromWallet({
                jobId: escrowJobId,
                amount: escrowAmount,
                payerAddress: address,
                forceRefresh: true,
              });
            }

            if (recoveredRelockedEscrowRecord) {
              manualBindings = [{
                escrowId,
                escrowRecordId: recoveredRelockedEscrowRecord || undefined,
                createTx: normalizedRelockTx || undefined,
              }];
              recoveredRecordId = recoveredRelockedEscrowRecord;
              relockMessage = 'Escrow record was recovered and rebound after on-chain re-lock.';
            } else if (normalizedRelockTx) {
              manualBindings = [{
                escrowId,
                createTx: normalizedRelockTx || undefined,
              }];
              relockMessage = 'Escrow was re-locked on-chain. Record sync is pending wallet indexing; retry sync once.';
            } else {
              relockError = 'Escrow re-lock transaction was submitted, but on-chain tx ID is still pending. Retry sync in a few seconds.';
            }
          } else {
            relockError = relockResult.error || 'Failed to re-lock escrow on-chain for legacy record repair.';
            console.warn('[Giver] Legacy escrow re-lock failed:', relockResult.error);
          }
        }
      }
    } catch (error) {
      console.warn('[Giver] Unable to recover escrow record from wallet before sync:', error);
    }

    await requestEscrowRecordSync([escrowId], manualBindings);
    await delay(1200);
    await requestEscrowRecordSync([escrowId], manualBindings);
    await fetchJobs();
    recoveredRecordId = recoveredRecordId || normalizeEscrowRecordReference(
      manualBindings.find((row) => row.escrowId === escrowId)?.escrowRecordId
    );

    if (!recoveredRecordId) {
      try {
        const client = createSupabaseClientWithToken(address);
        const { data: syncedEscrow } = await client
          .from('escrows')
          .select('escrow_record_id')
          .eq('id', escrowId)
          .maybeSingle();
        recoveredRecordId = normalizeEscrowRecordReference((syncedEscrow as any)?.escrow_record_id);
      } catch (error) {
        console.warn('[Giver] Unable to fetch synced escrow record after sync:', error);
      }
    }

    if (relockMessage) {
      window.alert(relockMessage);
    }
    if (relockError) {
      window.alert(relockError);
    }
    return normalizeEscrowRecordReference(recoveredRecordId);
  }, [
    address,
    executeTransaction,
    transactionStatus,
    requestRecords,
    requestEscrowRecordSync,
    fetchJobs,
    recoverEscrowRecordFromWallet,
    resolveOnchainTransactionIdWithRetry,
    findEscrowCreateTxFromHistory,
  ]);

  const verifyWorkProof = useCallback(async (applicationId: string) => {
    if (!address || !applicationId) return;

    setVerifyingProofId(applicationId);
    try {
      const result = await apiRequest<WorkProofActionResponse>('/api/work-proofs/verify', {
        method: 'POST',
        body: { applicationId, aleoAddress: address },
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to verify seeker proof');
      }

      await Promise.all([fetchJobs(), refreshGiverReputation()]);
      alert('Seeker proof verified. Escrow release is now enabled for this job.');
    } catch (error: any) {
      console.error('[Giver] Failed to verify work proof:', error);
      alert(`Failed to verify proof: ${error?.message || 'Unknown error'}`);
    } finally {
      setVerifyingProofId(null);
    }
  }, [address, fetchJobs, refreshGiverReputation]);

  useEffect(() => {
    const missingEscrowIds = jobs
      .flatMap((job) => job.escrows || [])
      .filter((escrow) => escrow.status === 'locked' && !isSpendableEscrowRecordReference(escrow.escrow_record_id))
      .map((escrow) => escrow.id)
      .filter((escrowId) => !attemptedEscrowSyncRef.current.has(escrowId));

    if (!missingEscrowIds.length) return;

    for (const escrowId of missingEscrowIds) {
      attemptedEscrowSyncRef.current.add(escrowId);
    }

    void (async () => {
      await requestEscrowRecordSync(missingEscrowIds);
      await fetchJobs();
    })();
  }, [jobs, requestEscrowRecordSync, fetchJobs]);

  useEffect(() => {
    const escrowsWithTransactions = jobs
      .flatMap((job) => job.escrows || [])
      .filter((escrow) => Boolean(escrow.create_tx || escrow.release_tx || escrow.refund_tx))
      .map((escrow) => escrow.id);

    const uniqueEscrowIds = Array.from(new Set(escrowsWithTransactions));
    if (!uniqueEscrowIds.length) return;

    const now = Date.now();
    if (reconciliationInFlightRef.current) return;
    if (now - lastReconcileAtRef.current < 20000) return;

    reconciliationInFlightRef.current = true;
    lastReconcileAtRef.current = now;

    void (async () => {
      try {
        await requestTransactionReconcile(uniqueEscrowIds);
        await fetchJobs();
      } finally {
        reconciliationInFlightRef.current = false;
      }
    })();
  }, [jobs, requestTransactionReconcile, fetchJobs]);

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const extractApiErrorMessage = (error: unknown): string => {
    if (!(error instanceof ApiRequestError)) {
      return error instanceof Error ? error.message : String(error || '');
    }

    const payload = error.payload;
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }

    if (payload && typeof payload === 'object') {
      const message = (payload as Record<string, unknown>).message;
      const reason = (payload as Record<string, unknown>).error;
      if (typeof message === 'string' && message.trim()) return message.trim();
      if (typeof reason === 'string' && reason.trim()) return reason.trim();
    }

    return error.message || '';
  };

  const acceptApplicationClientFallback = async (options: {
    applicationId: string;
    jobId: string;
    freelancerId: string;
    amount: number;
    transactionId?: string;
  }): Promise<{ escrowId?: string; transactionId: string }> => {
    if (!address) {
      throw new Error('Wallet address is required for fallback escrow flow.');
    }

    const client = createSupabaseClientWithToken(address);

    const { data: employerProfile, error: employerError } = await client
      .from('profiles')
      .select('id, role')
      .eq('aleo_address', address)
      .single();

    if (employerError || !employerProfile?.id) {
      throw new Error('Unable to resolve employer profile for fallback escrow flow.');
    }

    if (employerProfile.role !== 'giver') {
      throw new Error('Wallet role is locked and cannot execute giver escrow flow.');
    }

    const { error: applicationUpdateError } = await client
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', options.applicationId);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message || 'Failed to mark application as accepted.');
    }

    const { data: existingEscrow, error: existingEscrowError } = await client
      .from('escrows')
      .select('id, create_tx, amount, status, freelancer_id')
      .eq('job_id', options.jobId)
      .maybeSingle();

    if (existingEscrowError) {
      throw new Error(existingEscrowError.message || 'Failed to inspect existing escrow.');
    }

    if (existingEscrow?.id) {
      const { error: escrowUpdateError } = await client
        .from('escrows')
        .update({
          freelancer_id: options.freelancerId,
          status: 'locked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEscrow.id);

      if (escrowUpdateError) {
        throw new Error(escrowUpdateError.message || 'Failed to assign prefunded escrow to accepted seeker.');
      }

      const { error: jobUpdateError } = await client
        .from('jobs')
        .update({ payment_status: 'locked' })
        .eq('id', options.jobId);

      if (jobUpdateError) {
        throw new Error(jobUpdateError.message || 'Failed to update job payment status.');
      }

      return {
        escrowId: existingEscrow.id,
        transactionId: existingEscrow.create_tx || options.transactionId || 'prefunded',
      };
    }

    if (!options.transactionId) {
      throw new Error('Escrow transaction ID is required when no prefunded escrow exists.');
    }

    const { data: insertedEscrow, error: escrowInsertError } = await client
      .from('escrows')
      .insert({
        job_id: options.jobId,
        employer_id: employerProfile.id,
        freelancer_id: options.freelancerId,
        amount: options.amount,
        status: 'locked',
        create_tx: options.transactionId || null,
      })
      .select('id, create_tx')
      .single();

    if (escrowInsertError) {
      await client.from('applications').update({ status: 'pending' }).eq('id', options.applicationId);

      // Job already has escrow row; normalize job state and continue.
      if (escrowInsertError.code === '23505') {
        const { data: existingEscrow } = await client
          .from('escrows')
          .select('id, create_tx')
          .eq('job_id', options.jobId)
          .maybeSingle();

        await client.from('jobs').update({ payment_status: 'locked' }).eq('id', options.jobId);
        return {
          escrowId: existingEscrow?.id,
          transactionId: existingEscrow?.create_tx || options.transactionId || 'prefunded',
        };
      }

      throw new Error(escrowInsertError.message || 'Failed to store escrow record.');
    }

    const { error: jobUpdateError } = await client
      .from('jobs')
      .update({ payment_status: 'locked' })
      .eq('id', options.jobId);

    if (jobUpdateError) {
      throw new Error(jobUpdateError.message || 'Failed to update job payment status.');
    }

    return {
      escrowId: insertedEscrow?.id,
      transactionId: insertedEscrow?.create_tx || options.transactionId || 'prefunded',
    };
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    if (!address || roleStatus !== 'giver') return;

    try {
      setIsSubmitting(true);

      if (newStatus === 'rejected') {
        const client = createSupabaseClientWithToken(address);
        const { error } = await client.from('applications').update({ status: 'rejected' }).eq('id', applicationId);
        if (error) throw error;
        await Promise.all([fetchJobs(), refreshGiverReputation()]);
        return;
      }

      if (!executeTransaction) {
        throw new Error('Wallet transaction execution is unavailable.');
      }

      const targetJob = jobs.find((job) => job.applications?.some((application) => application.id === applicationId));
      const amount = parseBudgetMax(targetJob?.budget || '');
      const targetApplication = targetJob?.applications?.find((application) => application.id === applicationId);
      const freelancerAddress = targetApplication?.seeker?.aleo_address;
      const prefundedEscrow = selectBestLockedEscrow(targetJob, targetApplication?.seeker_id);

      if (!targetJob || !targetApplication || !freelancerAddress) {
        throw new Error('Unable to locate application or seeker address for escrow.');
      }

      if (!amount || amount <= 0) {
        throw new Error('Invalid escrow amount for selected job.');
      }

      let walletEscrowTransactionId: string | undefined;
      let walletEscrowRecordId: string | undefined;
      const escrowAmount = prefundedEscrow?.amount ? Number(prefundedEscrow.amount) : amount;

      if (!prefundedEscrow) {
        const walletEscrow = await createEscrowWithWallet(
          executeTransaction,
          transactionStatus,
          requestRecords,
          address,
          freelancerAddress,
          targetJob.id,
          escrowAmount
        );

        if (!walletEscrow.success || !walletEscrow.transactionId) {
          throw new Error(walletEscrow.error || 'Wallet failed to create escrow transaction.');
        }

        const localEscrowTxId = walletEscrow.walletTransactionId || walletEscrow.transactionId;
        const resolvedEscrowTxId =
          (await resolveOnchainTransactionId(localEscrowTxId, [ALEO_CONFIG.programs.escrow])) ||
          walletEscrow.transactionId;

        walletEscrowTransactionId = resolvedEscrowTxId;
        walletEscrowRecordId = await recoverEscrowRecordFromWallet({
          jobId: targetJob.id,
          amount: escrowAmount,
          payerAddress: address,
        });
      }

      const body: Record<string, unknown> = {
        applicationId,
        aleoAddress: address,
        amount: escrowAmount,
      };

      if (walletEscrowTransactionId) {
        body.escrowTransactionId = walletEscrowTransactionId;
      }
      if (walletEscrowRecordId) {
        body.escrowRecordId = walletEscrowRecordId;
      }

      let result: AcceptResponse | null = null;
      let acceptError: unknown = null;

      try {
        result = await apiRequest<AcceptResponse>('/api/jobs/accept', {
          method: 'POST',
          body,
        });
      } catch (error) {
        acceptError = error;
        if (error instanceof ApiRequestError) {
          const errorMessage = extractApiErrorMessage(error).toLowerCase();
          const shouldTryApplicationRoute =
            error.status === 404 ||
            errorMessage.includes('employerprivatekey') ||
            errorMessage.includes('route not found');

          if (shouldTryApplicationRoute) {
            try {
              result = await apiRequest<AcceptResponse>(`/api/jobs/${applicationId}/accept`, {
                method: 'POST',
                body,
              });
              acceptError = null;
            } catch (secondaryError) {
              acceptError = secondaryError;
            }
          }
        }
      }

      if (!result) {
        const acceptErrorMessage = extractApiErrorMessage(acceptError).toLowerCase();
        const shouldUseClientFallback =
          acceptError instanceof ApiRequestError &&
          (
            acceptError.status === 404 ||
            acceptError.status === 500 ||
            acceptErrorMessage.includes('employerprivatekey') ||
            acceptErrorMessage.includes('route not found') ||
            acceptErrorMessage.includes('internal server error')
          );

        if (!shouldUseClientFallback) {
          throw acceptError || new Error('Failed to accept application.');
        }

        const fallbackResult = await acceptApplicationClientFallback({
          applicationId,
          jobId: targetJob.id,
          freelancerId: targetApplication.seeker_id,
          amount: escrowAmount,
          transactionId: walletEscrowTransactionId,
        });

        await Promise.all([fetchJobs(), refreshGiverReputation()]);
        alert(`Application accepted. Escrow tx: ${fallbackResult.transactionId}`);
        return;
      }

      if (!result?.success) {
        throw new Error(result?.message || result?.error || 'Failed to accept application');
      }

      await Promise.all([fetchJobs(), refreshGiverReputation()]);

      if (result.data?.escrow?.transactionId) {
        alert(`Application accepted. Escrow tx: ${result.data.escrow.transactionId}`);
      } else {
        alert(prefundedEscrow
          ? 'Application accepted. Prefunded escrow is now assigned to this seeker.'
          : 'Application accepted and escrow created on-chain.');
      }
    } catch (error: any) {
      console.error('[Giver] Failed to update application:', error);
      let detail = error?.message || 'Unknown error';
      if (error instanceof ApiRequestError && error.payload) {
        if (typeof error.payload === 'string' && error.payload.trim()) {
          detail = error.payload.trim();
        } else if (typeof error.payload === 'object') {
          const payload = error.payload as Record<string, unknown>;
          const message = payload.message;
          const reason = payload.error;
          if (typeof message === 'string' && message.trim()) {
            detail = message.trim();
          } else if (typeof reason === 'string' && reason.trim()) {
            detail = reason.trim();
          }
        }
      }
      alert(`Failed to update application: ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address || !connected || !executeTransaction) {
      alert('Initialize wallet first.');
      return;
    }

    if (roleStatus !== 'giver') {
      alert('This wallet is not registered as a giver.');
      return;
    }

    const budgetMin = Number(formData.budgetMin);
    const budgetMax = Number(formData.budgetMax);

    if (!formData.title.trim() || !formData.description.trim() || Number.isNaN(budgetMin) || Number.isNaN(budgetMax)) {
      alert('Fill title, description, and valid budget values.');
      return;
    }

    const confirmPost = window.confirm(
      `Posting this opportunity charges 3 Aleo credits.\n` +
      `Escrow amount for payout will lock the maximum budget (${budgetMax} credits) immediately at posting.\n\n` +
      `Title: ${formData.title}\n` +
      `Budget: ${budgetMin}-${budgetMax} credits\n\n` +
      `Continue?`
    );

    if (!confirmPost) return;

    try {
      setIsSubmitting(true);
      // Posting requires a 3-credit payment for each new job listing.
      let postingProof = '';
      const feeResult = await transferCredits(executeTransaction, transactionStatus, address, true);
      if (!feeResult.success || !feeResult.transactionId) {
        throw new Error(feeResult.error || 'Failed to deduct posting credit fee');
      }

      const feeWalletTx = feeResult.walletTransactionId || feeResult.transactionId;
      const resolvedFeeTx =
        (await resolveOnchainTransactionId(feeWalletTx, [ALEO_CONFIG.programs.accessControl])) ||
        feeResult.transactionId;

      postingProof = `tx:${resolvedFeeTx}`;
      setHasPostingAccess(true);
      setAccessProofHash(postingProof);

      const verification = await refreshPostingAccess(resolvedFeeTx);
      if (verification) {
        const verificationStatus = String(verification.transaction?.status || '').toLowerCase();
        if (FAILED_TX_STATUSES.has(verificationStatus)) {
          throw new Error(`Posting payment transaction failed on-chain (${verificationStatus}).`);
        }

        postingProof = getAccessProofHash(verification) || postingProof;
        setAccessProofHash(postingProof);
      }

      const skills = formData.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

      const jobId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const escrowFunding = await createJobEscrowWithWallet(
        executeTransaction,
        transactionStatus,
        requestRecords,
        address,
        jobId,
        budgetMax
      );

      if (!escrowFunding.success || !escrowFunding.transactionId) {
        throw new Error(escrowFunding.error || 'Failed to lock escrow on-chain for this job post.');
      }

      const escrowWalletTx = escrowFunding.walletTransactionId || escrowFunding.transactionId;
      const resolvedEscrowCreateTx =
        (await resolveOnchainTransactionId(escrowWalletTx, [ALEO_CONFIG.programs.escrow])) ||
        escrowFunding.transactionId;
      const recoveredEscrowRecord = await recoverEscrowRecordFromWallet({
        jobId,
        amount: budgetMax,
        payerAddress: address,
      });

      try {
        const response = await apiRequest<CreateJobResponse>('/api/jobs/create', {
          method: 'POST',
          body: {
            jobId,
            aleoAddress: address,
            title: formData.title.trim(),
            description: formData.description.trim(),
            skills,
            budgetMin,
            budgetMax,
            zkMembershipHash: postingProof || `proof:pending:${Date.now()}`,
            escrowAmount: budgetMax,
            escrowTransactionId: resolvedEscrowCreateTx,
            escrowRecordId: recoveredEscrowRecord || undefined,
          },
          headers: {
            'x-aleo-address': address,
          },
        });

        if (!response.success) {
          throw new Error(response.message || response.error || 'Unable to post opportunity.');
        }
      } catch (apiError) {
        const shouldFallbackToDirectInsert =
          !(apiError instanceof ApiRequestError) ||
          apiError.status === 404 ||
          apiError.status === 502 ||
          apiError.status === 503 ||
          apiError.status === 504;

        if (!shouldFallbackToDirectInsert) {
          throw apiError;
        }

        console.warn('[Giver] /api/jobs/create unavailable, falling back to direct insert:', apiError);

        const client = createSupabaseClientWithToken(address);

        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('id, role, role_locked')
          .eq('aleo_address', address)
          .single();

        if (profileError || !profile?.id) {
          throw new Error(profileError?.message || 'Unable to resolve giver profile.');
        }
        if (profile.role !== 'giver') {
          throw new Error('Wallet role is locked as seeker. Posting is disabled.');
        }

        if (!profile.role_locked) {
          const { error: roleLockError } = await client
            .from('profiles')
            .update({ role: 'giver', role_locked: true, updated_at: new Date().toISOString() })
            .eq('id', profile.id);

          if (roleLockError) {
            console.warn('[Giver] Failed to backfill role lock in fallback mode:', roleLockError);
          }
        }

        const { error: jobError } = await client.from('jobs').insert({
          id: jobId,
          giver_id: profile.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          skills,
          budget: `${budgetMin}-${budgetMax} credits`,
          is_active: true,
          payment_status: 'locked',
          zk_membership_hash: postingProof || `proof:pending:${Date.now()}`,
        });

        if (jobError) throw jobError;

        const { error: escrowError } = await client.from('escrows').insert({
          job_id: jobId,
          employer_id: profile.id,
          freelancer_id: null,
          amount: budgetMax,
          status: 'locked',
          create_tx: resolvedEscrowCreateTx,
          escrow_record_id: recoveredEscrowRecord || null,
        });

        if (escrowError) {
          await client.from('jobs').delete().eq('id', jobId);
          throw escrowError;
        }
      }

      setFormData(initialForm);
      setShowCreateJob(false);
      await Promise.all([fetchJobs(), refreshGiverReputation()]);
      alert(`Opportunity posted. 3-credit fee paid and ${budgetMax} credits locked in escrow.`);
    } catch (error: any) {
      console.error('[Giver] Post job failed:', error);
      alert(`Failed to post job: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardJobs: GiverJobRow[] = useMemo(() => {
    return jobs.map((job) => {
      const escrow = selectPrimaryEscrowForJob(job);

      return {
        id: job.id,
        title: job.title,
        summary: job.description,
        skills: job.skills || [],
        budget: job.budget,
        isActive: job.is_active,
        paymentStatus: job.payment_status,
        escrowStatus: escrow?.status,
        escrowAmount: escrow?.amount,
        applications:
          job.applications?.map((application) => ({
            id: application.id,
            seekerName: toSeekerAlias(application.seeker?.aleo_address),
            seekerAddress: application.seeker?.aleo_address
              ? `${application.seeker.aleo_address.slice(0, 12)}...`
              : 'Unknown',
            status: application.status,
            appliedAt: application.created_at,
            score: application.seeker?.profile_score,
            skills: application.seeker?.skills || [],
          })) || [],
      };
    });
  }, [jobs]);

  const lockedEscrows = useMemo(() => {
    return jobs.flatMap((job) => {
      const lockedEscrow = selectBestLockedEscrow(job);
      if (!lockedEscrow) return [];

      return [{
        jobId: job.id,
        jobTitle: job.title,
        escrow: lockedEscrow,
        acceptedApplication: selectAcceptedApplicationForEscrow(job, lockedEscrow),
      }];
    });
  }, [jobs]);

  const proofReviewQueue = useMemo(() => {
    return jobs.flatMap((job) =>
      (job.applications || [])
        .filter((application) => application.status === 'accepted')
        .map((application) => ({
          jobId: job.id,
          jobTitle: job.title,
          applicationId: application.id,
          seekerName: toSeekerAlias(application.seeker?.aleo_address),
          seekerAddress: application.seeker?.aleo_address || '',
          proofStatus: application.work_proof_status || 'not_submitted',
          proofHash: application.work_proof_hash || '',
          proofTx: application.work_proof_tx || '',
          proofUrl: decodeProofUrl(application.work_proof_notes),
          submittedAt: application.work_proof_submitted_at || '',
        }))
    );
  }, [jobs]);

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Wallet Not Initialized"
          description="Initialize Wallet to access the Giver Control Panel and escrow controls."
        />
      </div>
    );
  }

  if (roleStatus === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-brand-text-muted md:px-6">
        Resolving wallet role...
      </div>
    );
  }

  if (roleStatus === 'unassigned') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Role Selection Required"
          description="This wallet has no assigned role yet. Select Job Giver in onboarding to access this panel."
          actionLabel="Go To Role Selection"
          onAction={() => window.location.assign('/get-started')}
        />
      </div>
    );
  }

  if (roleStatus !== 'giver') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
        <EmptyState
          title="Wallet Locked As Seeker"
          description="This wallet cannot switch to Job Giver. Open the Seeker panel with this wallet, or connect a different wallet."
          actionLabel="Open Seeker Panel"
          onAction={() => window.location.assign('/seeker')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-6">
      {isCheckingAccess && (
        <section className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-brand-text-muted">
            <Loader2 className="animate-spin" size={15} />
            Verifying giver access proof on Aleo testnet...
          </div>
        </section>
      )}

      {!isCheckingAccess && (
        <section className="glass-card rounded-2xl p-4">
          <p className="font-medium text-brand-text">Posting Payment Policy</p>
        <p className="mt-1 text-sm text-brand-text-muted">
            Every new job post charges 3 Aleo credits. Maximum budget is locked in escrow immediately at posting.
        </p>
          {hasPostingAccess && accessProofHash && (
            <p className="mt-2 break-all text-xs text-brand-text-muted">Last posting proof: {accessProofHash}</p>
          )}
        </section>
      )}

      <section className="glass-card rounded-2xl p-4">
        <p className="font-medium text-brand-text">Giver Reputation: {giverReputation}/100</p>
        <p className="mt-1 text-sm text-brand-text-muted">
          Reputation is computed from jobs posted ({giverMetrics.jobsPosted}) and total escrow generated ({giverMetrics.totalEscrowGenerated.toFixed(2)} credits).
        </p>
      </section>

      <GiverDashboard
        walletAddress={address || ''}
        jobs={dashboardJobs}
        expandedJobIds={expandedJobs}
        onToggleExpanded={toggleJobExpanded}
        onAccept={(applicationId) => updateApplicationStatus(applicationId, 'accepted')}
        onReject={(applicationId) => updateApplicationStatus(applicationId, 'rejected')}
        isSubmitting={isSubmitting || fetchingJobs || isCheckingAccess}
        onOpenCreateJob={() => setShowCreateJob((prev) => !prev)}
      />

      {showCreateJob && (
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-brand-text">Create New Opportunity</h2>
          <p className="mt-1 text-sm text-brand-text-muted">Define scope, budget range, and skill proof requirements.</p>

          <form onSubmit={handlePostJob} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-brand-text-muted">Title</label>
              <input
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                placeholder="Zero-knowledge frontend engineer"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-brand-text-muted">Description</label>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[120px] w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                placeholder="Scope, delivery signals, and expected proofs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-brand-text-muted">Skills (comma separated)</label>
              <input
                value={formData.skills}
                onChange={(event) => setFormData((prev) => ({ ...prev, skills: event.target.value }))}
                className="w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                placeholder="React, TypeScript, Leo"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-brand-text-muted">Minimum budget</label>
                <input
                  type="number"
                  min={1}
                  value={formData.budgetMin}
                  onChange={(event) => setFormData((prev) => ({ ...prev, budgetMin: event.target.value }))}
                  className="w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-brand-text-muted">Maximum budget (Locked in escrow at posting)</label>
                <input
                  type="number"
                  min={Number(formData.budgetMin) || 1}
                  value={formData.budgetMax}
                  onChange={(event) => setFormData((prev) => ({ ...prev, budgetMax: event.target.value }))}
                  className="w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary/60"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting || isCheckingAccess}>
                {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : 'Post Opportunity (3 credits)'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting || isCheckingAccess}
                onClick={() => setShowCreateJob(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {proofReviewQueue.length > 0 && (
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-brand-text">Work Proof Verification Queue</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Seekers submit proof URLs (and optionally on-chain references). Verify here before releasing escrow.
          </p>

          <div className="mt-4 space-y-3">
            {proofReviewQueue.map((item) => (
              <div key={item.applicationId} className="rounded-xl border border-brand-border bg-brand-surface-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-brand-text">{item.jobTitle}</p>
                    <p className="mt-1 text-xs text-brand-text-muted">
                      Applicant: {item.seekerName}
                    </p>
                    <p className="mt-1 text-xs text-brand-text-muted">Proof status: {item.proofStatus}</p>
                    {item.proofTx && (
                      <p className="mt-1 text-xs font-mono text-brand-text-muted">tx: {item.proofTx}</p>
                    )}
                    {item.proofUrl && (
                      <p className="mt-1 text-xs text-brand-text-muted break-all">url: {item.proofUrl}</p>
                    )}
                  </div>

                  {item.proofStatus === 'submitted' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={verifyingProofId === item.applicationId}
                      onClick={() => verifyWorkProof(item.applicationId)}
                    >
                      {verifyingProofId === item.applicationId ? <Loader2 className="animate-spin" size={14} /> : 'Verify Proof'}
                    </Button>
                  ) : item.proofStatus === 'verified' ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      Proof Verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-text-muted">
                      Waiting For Submission
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {lockedEscrows.length > 0 && (
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-brand-text">Escrow Vault Actions</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Release or refund locked escrow records. Release activates only after seeker proof is verified.
          </p>

          <div className="mt-4 space-y-4">
            {lockedEscrows.map(({ jobId, jobTitle, escrow, acceptedApplication }) => (
              <div key={jobId} className="rounded-xl border border-brand-border bg-brand-surface-elevated p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-brand-text">{jobTitle}</p>
                  <p className="text-xs text-brand-text-muted">Locked amount: {escrow.amount} credits</p>
                </div>
                <EscrowActionPanel
                  escrowId={escrow.id}
                  escrowRecordId={toCleanString(escrow.escrow_record_id) || undefined}
                  status={escrow.status}
                  aleoAddress={address || ''}
                  payeeAddress={acceptedApplication?.seeker?.aleo_address || undefined}
                  completionProofField={acceptedApplication?.work_proof_hash || undefined}
                  canRelease={
                    acceptedApplication?.work_proof_status === 'verified' &&
                    Boolean(acceptedApplication?.seeker?.aleo_address)
                  }
                  releaseBlockedReason={
                    acceptedApplication?.work_proof_status === 'verified' && acceptedApplication?.seeker?.aleo_address
                      ? undefined
                      : !acceptedApplication?.seeker?.aleo_address
                        ? 'Escrow is not assigned to a seeker yet. Accept an application first.'
                        : 'Seeker proof must be submitted and verified before release.'
                  }
                  onSyncEscrowRecord={syncEscrowRecord}
                  onStatusChange={async () => {
                    await Promise.all([fetchJobs(), refreshGiverReputation()]);
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Giver;
