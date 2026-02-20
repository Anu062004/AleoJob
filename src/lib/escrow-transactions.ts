import { ALEO_CONFIG } from '../../lib/aleo-config';
import { extractRecordCommitmentToken as extractEscrowRecordCommitmentToken, normalizeEscrowRecordId } from './escrow-record-reference';

type ExecuteTransaction = ((options: any) => Promise<{ transactionId: string } | undefined>) | null | undefined;
type WalletTransactionStatusResponse = {
  status?: string;
  transactionId?: string;
} | null | undefined;
type WalletTransactionStatusFn = ((transactionId: string) => Promise<WalletTransactionStatusResponse>) | null | undefined;
type RequestRecordsFn = ((program: string, includePlaintext?: boolean) => Promise<unknown[]>) | null | undefined;

export interface EscrowTransactionResult {
  success: boolean;
  transactionId?: string;
  walletTransactionId?: string;
  status?: string;
  error?: string;
  proofField?: string;
}

const ESCROW_PRIORITY_FEE = 300_000;
const MICROCREDITS_PER_CREDIT = 1_000_000;
const ESCROW_FEE_BUFFER_MICROCREDITS = ESCROW_PRIORITY_FEE;
const FINAL_FAILURE_STATUSES = new Set(['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid']);
const FINAL_SUCCESS_STATUSES = new Set(['accepted', 'confirmed', 'finalized', 'completed', 'included', 'success']);
const CREDITS_RECORD_CACHE_TTL_MS = 45_000;
const FUNDING_CONVERSION_COOLDOWN_MS = 120_000;

let creditsRecordCache: { fetchedAt: number; records: unknown[] } | null = null;
const lastFundingConversionAtByKey = new Map<string, number>();

export function toAleoField(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + charCode;
    hash |= 0;
  }
  return `${Math.abs(hash)}field`;
}

function normalizeAddress(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeAmountCredits(amount: number): number {
  const normalized = Math.floor(Number(amount || 0));
  return normalized > 0 ? normalized : 0;
}

function toMicrocredits(credits: number): number {
  return Math.floor(credits * MICROCREDITS_PER_CREDIT);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function parseNumberToken(token: string): number {
  const normalized = String(token || '').replace(/[_ ,]/g, '').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function parseNumericFromUnknown(input: unknown): number {
  if (typeof input === 'number') {
    return parseNumberToken(String(input));
  }

  if (typeof input === 'string') {
    const withSuffix = input.match(/([0-9][0-9_,]*)u64/i);
    if (withSuffix?.[1]) {
      return parseNumberToken(withSuffix[1]);
    }
    const plain = input.match(/([0-9][0-9_,]*)/);
    if (plain?.[1]) {
      return parseNumberToken(plain[1]);
    }
    return 0;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const parsed = parseNumericFromUnknown(item);
      if (parsed > 0) return parsed;
    }
    return 0;
  }

  if (input && typeof input === 'object') {
    const value = input as Record<string, unknown>;
    const keyPriority = ['private', 'public', 'value', 'microcredits', 'amount'];
    for (const key of keyPriority) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = parseNumericFromUnknown(value[key]);
        if (parsed > 0) return parsed;
      }
    }
    for (const nested of Object.values(value)) {
      const parsed = parseNumericFromUnknown(nested);
      if (parsed > 0) return parsed;
    }
  }

  return 0;
}

function parseAddressFromUnknown(input: unknown): string {
  if (typeof input === 'string') {
    const match = input.match(/aleo1[0-9a-z]+/i);
    if (match?.[0]) {
      return normalizeAddress(match[0]);
    }
    return '';
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
    const keyPriority = ['private', 'public', 'value', 'owner', 'payer', 'payee', 'address'];
    for (const key of keyPriority) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const parsed = parseAddressFromUnknown(value[key]);
        if (parsed) return parsed;
      }
    }
    for (const nested of Object.values(value)) {
      const parsed = parseAddressFromUnknown(nested);
      if (parsed) return parsed;
    }
  }

  return '';
}

function collectFieldValues(input: unknown, fieldName: string, collector: unknown[] = []): unknown[] {
  if (!input || typeof fieldName !== 'string' || !fieldName.trim()) {
    return collector;
  }

  const target = fieldName.trim().toLowerCase();
  if (Array.isArray(input)) {
    for (const item of input) {
      collectFieldValues(item, fieldName, collector);
    }
    return collector;
  }

  if (input && typeof input === 'object') {
    const value = input as Record<string, unknown>;
    for (const [key, nested] of Object.entries(value)) {
      if (key.toLowerCase() === target) {
        collector.push(nested);
      }
      if (nested && typeof nested === 'object') {
        collectFieldValues(nested, fieldName, collector);
      }
    }
  }

  return collector;
}

function parseU64FromRecord(rawRecord: string, fieldName: string): number {
  const patterns = [
    new RegExp(`${fieldName}\\s*:\\s*"?([0-9][0-9_,]*)u64(?:\\.[a-z_]+)?"?`, 'i'),
    new RegExp(`"${fieldName}"\\s*:\\s*"?([0-9][0-9_,]*)u64(?:\\.[a-z_]+)?"?`, 'i'),
    new RegExp(`"${fieldName}"\\s*:\\s*\\{[^}]*"([0-9][0-9_,]*)u64(?:\\.[a-z_]+)?"`, 'i'),
    new RegExp(`${fieldName}\\s*:\\s*\\{[^}]*([0-9][0-9_,]*)u64(?:\\.[a-z_]+)?`, 'i'),
    new RegExp(`${fieldName}\\s*:\\s*"?([0-9][0-9_,]*)"?`, 'i'),
    new RegExp(`"${fieldName}"\\s*:\\s*"?([0-9][0-9_,]*)"?`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = rawRecord.match(pattern);
    if (match?.[1]) {
      const parsed = parseNumberToken(match[1]);
      if (parsed > 0 || match[1] === '0') {
        return parsed;
      }
    }
  }

  if (rawRecord.trim().startsWith('{')) {
    try {
      const parsedObject = JSON.parse(rawRecord);
      const fieldValues = collectFieldValues(parsedObject, fieldName);
      for (const fieldValue of fieldValues) {
        const parsed = parseNumericFromUnknown(fieldValue);
        if (parsed > 0) return parsed;
      }
    } catch {
      // Ignore JSON parse failure and fall back to regex-only behavior.
    }
  }

  return 0;
}

function parseAddressFromRecord(rawRecord: string, fieldName: string): string {
  const patterns = [
    new RegExp(`${fieldName}\\s*:\\s*(aleo1[0-9a-z]+)`, 'i'),
    new RegExp(`"${fieldName}"\\s*:\\s*"(aleo1[0-9a-z]+)"`, 'i'),
    new RegExp(`"${fieldName}"\\s*:\\s*\\{[^}]*"(aleo1[0-9a-z]+)"`, 'i'),
    new RegExp(`${fieldName}\\s*:\\s*\\{[^}]*?(aleo1[0-9a-z]+)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = rawRecord.match(pattern);
    if (match?.[1]) {
      return normalizeAddress(match[1]);
    }
  }

  if (rawRecord.trim().startsWith('{')) {
    try {
      const parsedObject = JSON.parse(rawRecord);
      const fieldValues = collectFieldValues(parsedObject, fieldName);
      for (const fieldValue of fieldValues) {
        const parsed = parseAddressFromUnknown(fieldValue);
        if (parsed) {
          return parsed;
        }
      }
      const fallbackParsed = parseAddressFromUnknown(parsedObject);
      if (fallbackParsed) {
        return fallbackParsed;
      }
    } catch {
      // Ignore JSON parse failure and fall back to regex-only behavior.
    }
  }

  // Last resort: if record text clearly includes owner + exactly one Aleo address.
  if (new RegExp(`"${fieldName}"|${fieldName}`, 'i').test(rawRecord)) {
    const addresses = rawRecord.match(/aleo1[0-9a-z]+/ig) || [];
    if (addresses.length === 1) {
      return normalizeAddress(addresses[0]);
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
      lower.startsWith('{') ||
      lower.startsWith('record1') ||
      lower.includes('microcredits') ||
      lower.includes('amount') ||
      lower.includes('owner')
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
    const looksLikeCreditsObject =
      keys.includes('owner') &&
      (keys.includes('microcredits') || keys.includes('amount'));

    if (looksLikeCreditsObject) {
      collector.add(JSON.stringify(objectValue));
    }

    for (const [key, value] of Object.entries(objectValue)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('record') ||
        lowerKey.includes('plaintext') ||
        lowerKey.includes('cipher') ||
        lowerKey.includes('owner') ||
        lowerKey.includes('microcredits') ||
        lowerKey.includes('amount') ||
        lowerKey === 'value' ||
        lowerKey === 'data' ||
        lowerKey === 'id'
      ) {
        collectRecordLikeStrings(value, collector);
      } else if (typeof value === 'object' || Array.isArray(value)) {
        collectRecordLikeStrings(value, collector);
      }
    }
  }

  return collector;
}

type FundingRecordCandidate = {
  input: unknown;
  text: string;
};

const ESCROW_REQUIRED_FIELDS = ['owner', 'payer', 'payee', 'amount', 'job_id', 'status'] as const;
const ESCROW_WRAPPER_KEYS = [
  'record',
  'record_plaintext',
  'recordPlaintext',
  'plaintext',
  'data',
  'value',
  'escrow',
  'recordData',
  'fields',
  'payload',
] as const;
const FIELD_TOKEN_PATTERN = /^[0-9]+field$/i;

function toCandidateText(input: unknown): string {
  if (typeof input === 'string') return input.trim();
  try {
    return JSON.stringify(input);
  } catch {
    return '';
  }
}

function collectFundingCandidatesFromRecord(record: unknown): FundingRecordCandidate[] {
  const results: FundingRecordCandidate[] = [];
  const seen = new Set<string>();

  const push = (input: unknown) => {
    if (input === undefined || input === null) return;
    const text = toCandidateText(input);
    if (!text) return;
    const key = `${typeof input}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ input, text });
  };

  for (const textCandidate of Array.from(collectRecordLikeStrings(record))) {
    push(textCandidate);
  }

  if (record && typeof record === 'object') {
    const objectValue = record as Record<string, unknown>;
    const likelyKeys = [
      'record',
      'record_plaintext',
      'recordPlaintext',
      'plaintext',
      'data',
      'value',
      'credits',
      'recordData',
    ];
    for (const key of likelyKeys) {
      if (Object.prototype.hasOwnProperty.call(objectValue, key)) {
        push(objectValue[key]);
      }
    }
  }

  push(record);
  return results;
}

function extractMicrocreditsFromUnknown(input: unknown): number {
  const direct = parseNumericFromUnknown(input);
  if (direct > 0) return direct;

  const microValues = collectFieldValues(input, 'microcredits');
  for (const value of microValues) {
    const parsed = parseNumericFromUnknown(value);
    if (parsed > 0) return parsed;
  }

  const amountValues = collectFieldValues(input, 'amount');
  for (const value of amountValues) {
    const parsed = parseNumericFromUnknown(value);
    if (parsed > 0) return parsed;
  }

  return 0;
}

function hasDirectEscrowRecordKeys(input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const value = input as Record<string, unknown>;
  return ESCROW_REQUIRED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function isOpaqueRecordReferenceObject(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const value = input as Record<string, unknown>;
  const type = String(
    value.type ||
    value.recordType ||
    value.record_type ||
    value.kind ||
    ''
  )
    .trim()
    .toLowerCase();

  const id = String(value.id || value.record_id || value.recordId || '').trim();
  const tag = String(value.tag || '').trim();
  const checksum = String(value.checksum || '').trim();
  const recordToken = extractEscrowRecordCommitmentToken(value);
  const hasRecordishType = type.includes('record');
  const hasOpaqueIdTagPair = FIELD_TOKEN_PATTERN.test(id) && FIELD_TOKEN_PATTERN.test(tag);

  if (hasOpaqueIdTagPair) {
    return true;
  }

  if (hasRecordishType && (FIELD_TOKEN_PATTERN.test(id) || FIELD_TOKEN_PATTERN.test(tag) || FIELD_TOKEN_PATTERN.test(checksum))) {
    return true;
  }

  const keys = Object.keys(value).map((key) => key.toLowerCase());
  const hasRecordishKeys = keys.some((key) => (
    key.includes('record') ||
    key.includes('cipher') ||
    key === 'id' ||
    key === 'tag' ||
    key === 'checksum' ||
    key === 'value' ||
    key === 'data'
  ));

  return hasRecordishKeys && Boolean(recordToken);
}

function isEscrowPlaintextRecord(text: string): boolean {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return false;

  const hasShape =
    normalized.includes('owner') &&
    normalized.includes('payer') &&
    normalized.includes('payee') &&
    normalized.includes('amount') &&
    normalized.includes('job_id') &&
    normalized.includes('status');

  return hasShape && (
    normalized.startsWith('{') ||
    normalized.includes('paymentescrow') ||
    normalized.includes('.private')
  );
}

function isRecordCommitmentString(text: string): boolean {
  return /^record1[0-9a-z]+$/i.test(String(text || '').trim());
}

function sanitizeEscrowExecutableInput(input: unknown, depth = 0): unknown {
  if (depth > 5 || input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return text;

    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        const unwrapped = sanitizeEscrowExecutableInput(parsed, depth + 1);
        if (unwrapped !== null && unwrapped !== undefined) {
          return unwrapped;
        }
      } catch {
        // Keep original string candidate.
      }
    }

    return text;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = sanitizeEscrowExecutableInput(item, depth + 1);
      if (hasDirectEscrowRecordKeys(nested)) {
        return nested;
      }
      if (typeof nested === 'string' && (isEscrowPlaintextRecord(nested) || isRecordCommitmentString(nested))) {
        return nested.trim();
      }
    }
    return input;
  }

  if (typeof input === 'object') {
    if (hasDirectEscrowRecordKeys(input)) {
      return input;
    }

    if (isOpaqueRecordReferenceObject(input)) {
      return input;
    }

    const value = input as Record<string, unknown>;
    for (const key of ESCROW_WRAPPER_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

      const nested = sanitizeEscrowExecutableInput(value[key], depth + 1);
      if (hasDirectEscrowRecordKeys(nested)) {
        return nested;
      }
      if (typeof nested === 'string' && (isEscrowPlaintextRecord(nested) || isRecordCommitmentString(nested))) {
        return nested.trim();
      }
    }
  }

  return input;
}

type EscrowSpendRecordCandidate = {
  input: unknown;
  text: string;
  isObjectInput: boolean;
  isDirectEscrowInput: boolean;
  isPlaintextEscrowInput: boolean;
  isRecordCommitmentInput: boolean;
  owner: string;
  payer: string;
  payee: string;
  amount: number | null;
  status: number | null;
  isProofLike: boolean;
  hasEscrowShape: boolean;
};

function collectEscrowSpendCandidatesFromRecord(record: unknown): EscrowSpendRecordCandidate[] {
  const candidates: EscrowSpendRecordCandidate[] = [];
  const seen = new Set<string>();

  const push = (input: unknown) => {
    if (input === undefined || input === null) return;
    const executableInput = sanitizeEscrowExecutableInput(input);
    const text = toCandidateText(executableInput);
    if (!text) return;
    const key = `${typeof executableInput}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);

    const owner = parseAddressFromUnknown(executableInput) || parseAddressFromRecord(text, 'owner');
    const payer = parseAddressFromRecord(text, 'payer');
    const payee = parseAddressFromRecord(text, 'payee');
    const amount =
      parseU64FromRecord(text, 'amount') ||
      (() => {
        const values = collectFieldValues(executableInput, 'amount');
        for (const value of values) {
          const parsed = parseNumericFromUnknown(value);
          if (parsed > 0) return parsed;
        }
        return 0;
      })();
    const status =
      parseU64FromRecord(text, 'status') ||
      (() => {
        const statusValues = collectFieldValues(executableInput, 'status');
        for (const value of statusValues) {
          const parsed = parseNumericFromUnknown(value);
          if (parsed >= 0) return parsed;
        }
        return 0;
      })();
    const lowerText = text.toLowerCase();
    const isProofLike =
      lowerText.includes('proof_hash') ||
      lowerText.includes('workproof') ||
      lowerText.includes('"seeker"') ||
      lowerText.includes('seeker:');
    const hasEscrowShape =
      amount > 0 &&
      (
        lowerText.includes('payer') ||
        Boolean(payer)
      ) &&
      (
        lowerText.includes('payee') ||
        Boolean(payee)
      );

    candidates.push({
      input: executableInput,
      text,
      isObjectInput: typeof executableInput === 'object' && executableInput !== null,
      isDirectEscrowInput: hasDirectEscrowRecordKeys(executableInput),
      isPlaintextEscrowInput: typeof executableInput === 'string' && isEscrowPlaintextRecord(executableInput),
      isRecordCommitmentInput: typeof executableInput === 'string' && isRecordCommitmentString(executableInput),
      owner,
      payer,
      payee,
      amount: amount > 0 ? amount : null,
      status: Number.isFinite(status) ? Number(status) : null,
      isProofLike,
      hasEscrowShape,
    });
  };

  for (const textCandidate of Array.from(collectRecordLikeStrings(record))) {
    push(textCandidate);
  }

  if (record && typeof record === 'object') {
    const objectValue = record as Record<string, unknown>;
    const likelyKeys = [
      'record',
      'record_plaintext',
      'recordPlaintext',
      'plaintext',
      'data',
      'value',
      'escrow',
      'recordData',
    ];
    for (const key of likelyKeys) {
      if (Object.prototype.hasOwnProperty.call(objectValue, key)) {
        push(objectValue[key]);
      }
    }
  }

  push(record);
  return candidates;
}

function selectEscrowSpendRecordInputFromList(
  records: unknown[],
  payerAddress: string,
  escrowRecordHint: string,
  payeeAddress?: string
): unknown | null {
  const hint = String(escrowRecordHint || '').trim();
  const normalizedPayer = normalizeAddress(payerAddress);
  const normalizedPayee = normalizeAddress(payeeAddress || '');

  const allCandidates: EscrowSpendRecordCandidate[] = [];
  for (const record of records || []) {
    allCandidates.push(...collectEscrowSpendCandidatesFromRecord(record));
  }

  // Strictly prefer escrow-shaped records and avoid work-proof records.
  const candidates = allCandidates.filter((candidate) => !candidate.isProofLike && candidate.hasEscrowShape);
  const fallbackCandidates = allCandidates.filter((candidate) => !candidate.isProofLike);

  const activeCandidates = candidates.length ? candidates : fallbackCandidates;
  if (!activeCandidates.length) {
    return null;
  }

  const payerOwned = activeCandidates.filter((candidate) => {
    if (!normalizedPayer) return true;
    return (
      candidate.owner === normalizedPayer ||
      candidate.payer === normalizedPayer ||
      candidate.text.toLowerCase().includes(normalizedPayer)
    );
  });

  const lockedOnly = payerOwned.filter((candidate) => candidate.status === 0 || candidate.status === null);

  const payeeFiltered = normalizedPayee
    ? lockedOnly.filter((candidate) => (
      !candidate.payee ||
      candidate.payee === normalizedPayee ||
      candidate.payee === normalizedPayer
    ))
    : lockedOnly;

  const preferredPool = payeeFiltered.length
    ? payeeFiltered
    : lockedOnly.length
      ? lockedOnly
      : payerOwned.length
        ? payerOwned
        : activeCandidates;

  const scored = preferredPool
    .map((candidate) => {
      let score = 0;
      if (candidate.isDirectEscrowInput) score += 180;
      else if (candidate.isPlaintextEscrowInput) score += 140;
      else if (candidate.isObjectInput) score += 40;
      if (candidate.hasEscrowShape) score += 70;
      if (candidate.status === 0 || candidate.status === null) score += 20;
      if (normalizedPayer && (candidate.owner === normalizedPayer || candidate.payer === normalizedPayer)) score += 15;
      if (normalizedPayee && candidate.payee === normalizedPayee) score += 12;
      if (candidate.isRecordCommitmentInput) score += 8;
      if (candidate.isObjectInput && !candidate.isDirectEscrowInput) score -= 60;
      if (hint) {
        if (candidate.text === hint) score += 18;
        if (candidate.text.includes(hint) || hint.includes(candidate.text)) score += 8;
        const recordToken = hint.match(/record1[0-9a-z]+/i)?.[0];
        if (recordToken && candidate.text.includes(recordToken)) score += 10;
      }
      return { ...candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  const deduped: EscrowSpendRecordCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of scored) {
    const key = candidate.text || toCandidateText(candidate.input);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped[0]?.input ?? null;
}

function listEscrowSpendRecordInputsFromList(
  records: unknown[],
  payerAddress: string,
  escrowRecordHint: string,
  payeeAddress?: string
): unknown[] {
  const hint = String(escrowRecordHint || '').trim();
  const normalizedPayer = normalizeAddress(payerAddress);
  const normalizedPayee = normalizeAddress(payeeAddress || '');

  const allCandidates: EscrowSpendRecordCandidate[] = [];
  for (const record of records || []) {
    allCandidates.push(...collectEscrowSpendCandidatesFromRecord(record));
  }

  const strictCandidates = allCandidates.filter((candidate) => !candidate.isProofLike && candidate.hasEscrowShape);
  const fallbackCandidates = allCandidates.filter((candidate) => !candidate.isProofLike);
  const activeCandidates = strictCandidates.length ? strictCandidates : fallbackCandidates;
  if (!activeCandidates.length) return [];

  const scored = activeCandidates
    .map((candidate) => {
      let score = 0;
      if (candidate.isDirectEscrowInput) score += 180;
      else if (candidate.isPlaintextEscrowInput) score += 140;
      else if (candidate.isObjectInput) score += 40;
      if (candidate.hasEscrowShape) score += 70;
      if (candidate.status === 0 || candidate.status === null) score += 20;
      if (normalizedPayer && (candidate.owner === normalizedPayer || candidate.payer === normalizedPayer)) score += 15;
      if (normalizedPayee && candidate.payee === normalizedPayee) score += 12;
      if (candidate.isRecordCommitmentInput) score += 8;
      if (candidate.isObjectInput && !candidate.isDirectEscrowInput) score -= 60;
      if (hint) {
        if (candidate.text === hint) score += 18;
        if (candidate.text.includes(hint) || hint.includes(candidate.text)) score += 8;
        const recordToken = hint.match(/record1[0-9a-z]+/i)?.[0];
        if (recordToken && candidate.text.includes(recordToken)) score += 10;
      }
      return { ...candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  const inputs: unknown[] = [];
  const seen = new Set<string>();
  for (const candidate of scored) {
    const key = candidate.text || toCandidateText(candidate.input);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    inputs.push(candidate.input);
  }
  return inputs;
}

function selectFundingRecordFromList(
  records: unknown[],
  payerAddress: string,
  requiredMicrocredits: number
): unknown {
  if (requiredMicrocredits <= 0) {
    return null;
  }

  const normalizedPayer = normalizeAddress(payerAddress);
  const parsedCandidates: Array<{ input: unknown; text: string; owner: string; microcredits: number }> = [];
  const fallbackCandidates: Array<{ input: unknown; text: string; owner: string }> = [];

  for (const record of records || []) {
    const candidates = collectFundingCandidatesFromRecord(record);
    for (const candidate of candidates) {
      const owner =
        parseAddressFromUnknown(candidate.input) ||
        parseAddressFromRecord(candidate.text, 'owner');
      const microcredits =
        parseU64FromRecord(candidate.text, 'microcredits') ||
        parseU64FromRecord(candidate.text, 'amount') ||
        extractMicrocreditsFromUnknown(candidate.input);
      if (!microcredits) {
        fallbackCandidates.push({
          input: candidate.input,
          text: candidate.text,
          owner,
        });
        continue;
      }
      parsedCandidates.push({
        input: candidate.input,
        text: candidate.text,
        owner,
        microcredits,
      });
    }
  }

  const ownerMatched = parsedCandidates
    .filter((candidate) => candidate.owner === normalizedPayer && candidate.microcredits >= requiredMicrocredits)
    .sort((a, b) => a.microcredits - b.microcredits);

  if (ownerMatched[0]?.input !== undefined) {
    return ownerMatched[0].input;
  }

  const amountMatched = parsedCandidates
    .filter((candidate) => candidate.microcredits >= requiredMicrocredits)
    .sort((a, b) => a.microcredits - b.microcredits);

  if (amountMatched[0]?.input !== undefined) {
    return amountMatched[0].input;
  }

  const payerMatchedFallback = fallbackCandidates.find((candidate) => {
    if (normalizedPayer && candidate.owner === normalizedPayer) return true;
    return normalizedPayer ? candidate.text.toLowerCase().includes(normalizedPayer) : false;
  });
  if (payerMatchedFallback) {
    return payerMatchedFallback.input;
  }

  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[0].input;
  }

  return null;
}

async function loadCreditsRecords(
  requestRecords: RequestRecordsFn,
  forceRefresh = false
): Promise<unknown[]> {
  if (!requestRecords) return [];

  if (!forceRefresh && creditsRecordCache && (Date.now() - creditsRecordCache.fetchedAt) < CREDITS_RECORD_CACHE_TTL_MS) {
    return creditsRecordCache.records;
  }

  let plaintextRecords: unknown[] = [];
  let opaqueRecords: unknown[] = [];
  let firstError: unknown = null;
  let secondError: unknown = null;

  try {
    plaintextRecords = await requestRecords('credits.aleo', true);
  } catch (error) {
    firstError = error;
  }

  try {
    opaqueRecords = await requestRecords('credits.aleo', false);
  } catch (error) {
    secondError = error;
  }

  const records = [...plaintextRecords, ...opaqueRecords];
  if (!records.length && (hasNotGrantedError(firstError) || hasNotGrantedError(secondError))) {
    throw new Error('WALLET_CREDITS_RECORD_ACCESS_NOT_GRANTED');
  }

  creditsRecordCache = {
    fetchedAt: Date.now(),
    records,
  };
  return records;
}

function hasNotGrantedError(error: unknown): boolean {
  const message = String(
    (error as any)?.message ||
    (error as any)?.reason ||
    (error as any)?.error?.message ||
    error ||
    ''
  ).toLowerCase();
  return message.includes('not_granted') || message.includes('not granted');
}

function isRecordLikeInput(value: unknown): boolean {
  if (!value) return false;
  const executable = sanitizeEscrowExecutableInput(value);
  if (!executable) return false;

  if (typeof executable === 'string') {
    const normalized = executable.trim();
    if (!normalized) return false;
    if (isRecordCommitmentString(normalized)) return false;
    if (isEscrowPlaintextRecord(normalized)) return true;

    if (normalized.startsWith('{')) {
      try {
        const parsed = JSON.parse(normalized);
        return hasDirectEscrowRecordKeys(parsed) || isOpaqueRecordReferenceObject(parsed);
      } catch {
        return false;
      }
    }

    return false;
  }

  if (typeof executable === 'object') {
    return hasDirectEscrowRecordKeys(executable) || isOpaqueRecordReferenceObject(executable);
  }

  return false;
}

function buildEscrowAttemptVariants(value: unknown): unknown[] {
  const variants: unknown[] = [];
  const seen = new Set<string>();
  const push = (candidate: unknown) => {
    if (candidate === null || candidate === undefined) return;
    const text = toCandidateText(candidate);
    if (!text || seen.has(text)) return;
    seen.add(text);
    variants.push(candidate);
  };

  const normalized = sanitizeEscrowExecutableInput(value);
  push(normalized);

  if (typeof normalized === 'string' && normalized.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(normalized);
      if (hasDirectEscrowRecordKeys(parsed)) {
        push(parsed);
      }
    } catch {
      // Keep string-only variant.
    }
  }

  if (hasDirectEscrowRecordKeys(normalized)) {
    const text = toCandidateText(normalized);
    if (isEscrowPlaintextRecord(text)) {
      push(text);
    }
  }

  return variants;
}

function buildEscrowHintInputs(rawHint: string, normalizedHint: string): unknown[] {
  const candidates: unknown[] = [];
  const seen = new Set<string>();

  const push = (value: string) => {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  push(rawHint);
  push(normalizedHint);
  return candidates;
}

async function loadEscrowRecords(
  requestRecords: RequestRecordsFn,
  forceRefresh = false
): Promise<unknown[]> {
  if (!requestRecords) return [];

  let plaintextRecords: unknown[] = [];
  let opaqueRecords: unknown[] = [];
  let firstError: unknown = null;
  let secondError: unknown = null;

  try {
    plaintextRecords = await requestRecords(ALEO_CONFIG.programs.escrow, true);
  } catch (error) {
    firstError = error;
  }

  try {
    opaqueRecords = await requestRecords(ALEO_CONFIG.programs.escrow, false);
  } catch (error) {
    secondError = error;
  }

  // Spending escrow requires a usable escrow record input, so explicit plaintext
  // access denial must be surfaced even if opaque commitments are returned.
  if (!plaintextRecords.length && hasNotGrantedError(firstError)) {
    throw new Error('WALLET_ESCROW_RECORD_ACCESS_NOT_GRANTED');
  }

  const records = [...plaintextRecords, ...opaqueRecords];
  if (!records.length && (hasNotGrantedError(firstError) || hasNotGrantedError(secondError))) {
    throw new Error('WALLET_ESCROW_RECORD_ACCESS_NOT_GRANTED');
  }

  if (forceRefresh) {
    return records;
  }

  return records;
}

async function resolveEscrowSpendRecordInput(options: {
  requestRecords: RequestRecordsFn;
  payerAddress: string;
  escrowRecordHint: string;
  payeeAddress?: string;
  forceRefresh?: boolean;
}): Promise<unknown | null> {
  const hint = String(options.escrowRecordHint || '').trim();
  const records = await loadEscrowRecords(options.requestRecords, Boolean(options.forceRefresh));

  const selected = selectEscrowSpendRecordInputFromList(
    records,
    options.payerAddress,
    hint,
    options.payeeAddress
  );

  if (selected !== null && selected !== undefined) {
    return selected;
  }

  return null;
}

async function resolveEscrowSpendRecordInputs(options: {
  requestRecords: RequestRecordsFn;
  payerAddress: string;
  escrowRecordHint: string;
  payeeAddress?: string;
  forceRefresh?: boolean;
}): Promise<unknown[]> {
  const records = await loadEscrowRecords(options.requestRecords, Boolean(options.forceRefresh));
  const inputs = listEscrowSpendRecordInputsFromList(
    records,
    options.payerAddress,
    options.escrowRecordHint,
    options.payeeAddress
  );
  return inputs;
}

async function selectFundingRecord(
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  requiredMicrocredits: number,
  forceRefresh = false
): Promise<unknown> {
  const records = await loadCreditsRecords(requestRecords, forceRefresh);
  return selectFundingRecordFromList(records, payerAddress, requiredMicrocredits);
}

async function resolveWalletTransactionId(
  transactionStatus: WalletTransactionStatusFn,
  walletTransactionId: string
): Promise<{ transactionId: string; status: string }> {
  if (!transactionStatus) {
    return { transactionId: walletTransactionId, status: 'unknown' };
  }

  let resolvedTransactionId = walletTransactionId;
  let latestStatus = 'unknown';

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const statusResponse = await transactionStatus(walletTransactionId);
      const status = String(statusResponse?.status || '').trim().toLowerCase();
      const transactionId = String(statusResponse?.transactionId || '').trim();

      if (status) {
        latestStatus = status;
      }

      if (transactionId) {
        resolvedTransactionId = transactionId;
      }

      if (transactionId && transactionId !== walletTransactionId) {
        return { transactionId: resolvedTransactionId, status: latestStatus || 'confirmed' };
      }

      if (FINAL_FAILURE_STATUSES.has(status)) {
        return { transactionId: resolvedTransactionId, status };
      }

      if (FINAL_SUCCESS_STATUSES.has(status) && resolvedTransactionId) {
        return { transactionId: resolvedTransactionId, status };
      }
    } catch (error) {
      console.warn('[escrow-transactions] transactionStatus lookup failed:', error);
    }

    if (attempt < 5) {
      await sleep(1200);
    }
  }

  return {
    transactionId: resolvedTransactionId,
    status: latestStatus,
  };
}

function extractWalletErrorMessage(error: any): string {
  const directCandidates = [
    error?.message,
    error?.reason,
    error?.error?.message,
    error?.data?.message,
    error?.data?.error,
    error?.response?.message,
    error?.response?.error,
    typeof error === 'string' ? error : '',
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (directCandidates[0]) {
    return directCandidates[0];
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return serialized;
    }
  } catch {
    // Ignore serialization errors.
  }

  return 'Unknown wallet error';
}

async function executeWalletTransition(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  options: {
    program: string;
    functionName: string;
    inputs: unknown[];
    fee?: number;
  }
): Promise<EscrowTransactionResult> {
  if (!executeTransaction) {
    return { success: false, error: 'Wallet transaction execution is unavailable.' };
  }

  try {
    const result = await executeTransaction({
      program: options.program,
      function: options.functionName,
      inputs: options.inputs,
      fee: options.fee ?? ESCROW_PRIORITY_FEE,
    });

    if (!result?.transactionId) {
      return {
        success: false,
        error: 'Transaction executed but no transaction ID was returned by wallet.',
      };
    }

    const walletTransactionId = result.transactionId.trim();
    const resolved = await resolveWalletTransactionId(transactionStatus, walletTransactionId);

    return {
      success: true,
      transactionId: resolved.transactionId || walletTransactionId,
      walletTransactionId,
      status: resolved.status,
    };
  } catch (error: any) {
    const message = extractWalletErrorMessage(error);
    if (message.toLowerCase().includes('reject') || message.toLowerCase().includes('cancel')) {
      return { success: false, error: 'Transaction request was rejected in wallet.' };
    }
    return { success: false, error: `Wallet transaction failed: ${message}` };
  }
}

async function executeEscrowTransition(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  options: {
    functionName: 'create_job_escrow' | 'create_escrow' | 'release_payment' | 'refund_payment' | 'submit_work_proof';
    inputs: unknown[];
  }
): Promise<EscrowTransactionResult> {
  return executeWalletTransition(executeTransaction, transactionStatus, {
    program: ALEO_CONFIG.programs.escrow,
    functionName: options.functionName,
    inputs: options.inputs,
    fee: ESCROW_PRIORITY_FEE,
  });
}

async function ensureFundingRecord(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  requiredMicrocredits: number
): Promise<{ fundingRecord: unknown; error?: string }> {
  const normalizedPayer = normalizeAddress(payerAddress);
  const conversionKey = `${normalizedPayer}:${requiredMicrocredits}`;
  const lastConvertedAt = lastFundingConversionAtByKey.get(conversionKey) || 0;

  let directFundingRecord: unknown = null;
  try {
    directFundingRecord = await selectFundingRecord(requestRecords, payerAddress, requiredMicrocredits, false);
  } catch (error) {
    const message = extractWalletErrorMessage(error).toLowerCase();
    if (message.includes('wallet_credits_record_access_not_granted') || hasNotGrantedError(error)) {
      return {
        fundingRecord: null,
        error: 'Leo Wallet denied credits record sharing (NOT_GRANTED). Confirm credits.aleo records and retry.',
      };
    }

    return {
      fundingRecord: null,
      error: `Unable to read credits record from wallet: ${extractWalletErrorMessage(error)}`,
    };
  }

  if (directFundingRecord) {
    return { fundingRecord: directFundingRecord };
  }

  if (Date.now() - lastConvertedAt < FUNDING_CONVERSION_COOLDOWN_MS) {
    return {
      fundingRecord: null,
      error: 'Public credits were already converted recently. Wait a little, then click Sync Escrow Record once more.',
    };
  }

  // If no private credits record exists, move funds from public balance into a private record.
  const conversion = await executeWalletTransition(executeTransaction, transactionStatus, {
    program: 'credits.aleo',
    functionName: 'transfer_public_to_private',
    inputs: [payerAddress, `${requiredMicrocredits}u64`],
    fee: ESCROW_PRIORITY_FEE,
  });

  if (!conversion.success) {
    return {
      fundingRecord: null,
      error:
        conversion.error ||
        `No credits.aleo record with at least ${requiredMicrocredits} microcredits was found in wallet.`,
    };
  }

  lastFundingConversionAtByKey.set(conversionKey, Date.now());

  await sleep(2200);
  let convertedRecord: unknown = null;
  try {
    convertedRecord = await selectFundingRecord(requestRecords, payerAddress, requiredMicrocredits, true);
  } catch (error) {
    const message = extractWalletErrorMessage(error).toLowerCase();
    if (message.includes('wallet_credits_record_access_not_granted') || hasNotGrantedError(error)) {
      return {
        fundingRecord: null,
        error: 'Public credits were converted, but credits record sharing is denied. Confirm credits.aleo records and retry.',
      };
    }

    return {
      fundingRecord: null,
      error: `Unable to load converted credits record from wallet: ${extractWalletErrorMessage(error)}`,
    };
  }

  if (convertedRecord) {
    return { fundingRecord: convertedRecord };
  }

  return {
    fundingRecord: null,
    error:
      'Public credits were converted, but wallet records are still indexing. Click Sync Escrow Record once more in a few seconds.',
  };
}

async function ensureWalletFeeFunding(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  minimumFeeMicrocredits: number = ESCROW_PRIORITY_FEE
): Promise<{ success: boolean; error?: string }> {
  const required = Math.max(Number(minimumFeeMicrocredits || 0), ESCROW_PRIORITY_FEE);
  const ensured = await ensureFundingRecord(
    executeTransaction,
    transactionStatus,
    requestRecords,
    payerAddress,
    required
  );

  if (!ensured.fundingRecord) {
    return {
      success: false,
      error:
        ensured.error ||
        `No private credits record with at least ${required} microcredits is available to pay network fee.`,
    };
  }

  return { success: true };
}

export async function createEscrowWithWallet(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  payeeAddress: string,
  jobId: string,
  amountCredits: number
): Promise<EscrowTransactionResult> {
  const normalizedAmountCredits = normalizeAmountCredits(amountCredits);
  if (!payerAddress || !payeeAddress || !jobId || normalizedAmountCredits <= 0) {
    return {
      success: false,
      error: 'Invalid create escrow parameters.',
    };
  }

  const amountMicrocredits = toMicrocredits(normalizedAmountCredits);
  const requiredFundingMicrocredits = amountMicrocredits + ESCROW_FEE_BUFFER_MICROCREDITS;
  const ensuredFunding = await ensureFundingRecord(
    executeTransaction,
    transactionStatus,
    requestRecords,
    payerAddress,
    requiredFundingMicrocredits
  );
  const fundingRecord = ensuredFunding.fundingRecord;

  if (!fundingRecord) {
    return {
      success: false,
      error:
        ensuredFunding.error ||
        `No credits.aleo record with at least ${amountMicrocredits} microcredits was found in wallet.`,
    };
  }

  return executeEscrowTransition(executeTransaction, transactionStatus, {
    functionName: 'create_escrow',
    inputs: [
      payerAddress,
      payerAddress,
      payeeAddress,
      `${amountMicrocredits}u64`,
      toAleoField(jobId),
      fundingRecord,
    ],
  });
}

export async function createJobEscrowWithWallet(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  jobId: string,
  amountCredits: number
): Promise<EscrowTransactionResult> {
  const normalizedAmountCredits = normalizeAmountCredits(amountCredits);
  if (!payerAddress || !jobId || normalizedAmountCredits <= 0) {
    return {
      success: false,
      error: 'Invalid job escrow parameters.',
    };
  }

  const amountMicrocredits = toMicrocredits(normalizedAmountCredits);
  const requiredFundingMicrocredits = amountMicrocredits + ESCROW_FEE_BUFFER_MICROCREDITS;
  const ensuredFunding = await ensureFundingRecord(
    executeTransaction,
    transactionStatus,
    requestRecords,
    payerAddress,
    requiredFundingMicrocredits
  );
  const fundingRecord = ensuredFunding.fundingRecord;

  if (!fundingRecord) {
    return {
      success: false,
      error:
        ensuredFunding.error ||
        `No credits.aleo record with at least ${amountMicrocredits} microcredits was found in wallet.`,
    };
  }

  return executeEscrowTransition(executeTransaction, transactionStatus, {
    functionName: 'create_job_escrow',
    inputs: [
      payerAddress,
      payerAddress,
      `${amountMicrocredits}u64`,
      toAleoField(jobId),
      fundingRecord,
    ],
  });
}

export async function releaseEscrowWithWallet(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  escrowRecordId: string,
  payeeAddress: string,
  completionProofField: string
): Promise<EscrowTransactionResult> {
  const rawEscrowRecordHint = String(escrowRecordId || '').trim();
  const normalizedEscrowRecordId = normalizeEscrowRecordId(escrowRecordId);
  if ((!normalizedEscrowRecordId && !isRecordLikeInput(rawEscrowRecordHint)) || !payeeAddress || !completionProofField) {
    return {
      success: false,
      error: 'Escrow record ID, payee address, and completion proof are required to release escrow.',
    };
  }

  const funding = await ensureWalletFeeFunding(
    executeTransaction,
    transactionStatus,
    requestRecords,
    payerAddress,
    ESCROW_PRIORITY_FEE
  );
  if (!funding.success) {
    return {
      success: false,
      error: funding.error || 'Unable to prepare private credits for release fee.',
    };
  }

  let initialEscrowInput: unknown | null = null;
  let initialCandidates: unknown[] = [];
  try {
    initialEscrowInput = await resolveEscrowSpendRecordInput({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      payeeAddress,
      forceRefresh: false,
    });
    initialCandidates = await resolveEscrowSpendRecordInputs({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      payeeAddress,
      forceRefresh: false,
    });
  } catch (error) {
    const message = extractWalletErrorMessage(error).toLowerCase();
    const fallbackHintInput = isRecordLikeInput(rawEscrowRecordHint) ? rawEscrowRecordHint : '';

    if (fallbackHintInput) {
      initialEscrowInput = fallbackHintInput;
      initialCandidates = [];
      console.warn('[escrow-transactions] Falling back to provided escrow hint after wallet record read failure (release).', {
        payerAddress,
        payeeAddress,
        reason: message,
      });
    } else if (message.includes('wallet_escrow_record_access_not_granted')) {
      return {
        success: false,
        error: 'Leo Wallet denied escrow record sharing (NOT_GRANTED). Re-open wallet prompt and click Confirm for escrow_v4.aleo records.',
      };
    } else {
      return {
        success: false,
        error: `Unable to read escrow record from wallet: ${extractWalletErrorMessage(error)}`,
      };
    }
  }

  const attemptInputs: unknown[] = [];
  const seen = new Set<string>();
  const pushAttempt = (value: unknown) => {
    const variants = buildEscrowAttemptVariants(value);
    for (const variant of variants) {
      const executableInput: unknown = sanitizeEscrowExecutableInput(variant);
      if (!isRecordLikeInput(executableInput)) continue;
      const key = toCandidateText(executableInput);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      attemptInputs.push(executableInput);
    }
  };

  pushAttempt(initialEscrowInput);
  for (const candidate of initialCandidates) {
    pushAttempt(candidate);
  }
  for (const hintCandidate of buildEscrowHintInputs(rawEscrowRecordHint, normalizedEscrowRecordId)) {
    pushAttempt(hintCandidate);
  }

  if (!attemptInputs.length) {
    console.warn('[escrow-transactions] No spendable escrow inputs resolved for release.', {
      payerAddress,
      payeeAddress,
      hint: normalizedEscrowRecordId || rawEscrowRecordHint,
      initialEscrowInputType: typeof initialEscrowInput,
      initialCandidatesCount: initialCandidates.length,
    });
    return {
      success: false,
      error: 'No spendable escrow record found in this wallet account. Connect the same wallet/account that locked escrow, then sync and retry.',
    };
  }

  let lastResult: EscrowTransactionResult = {
    success: false,
    error: 'No valid escrow record candidates found.',
  };

  const maxAttempts = Math.min(attemptInputs.length, 5);
  for (let index = 0; index < maxAttempts; index += 1) {
    const escrowInput = attemptInputs[index];
    const result = await executeEscrowTransition(executeTransaction, transactionStatus, {
      functionName: 'release_payment',
      inputs: [escrowInput, payeeAddress, completionProofField],
    });
    lastResult = result;
    if (result.success) return result;

    const errorText = String(result.error || '').toLowerCase();
    const shouldContinue =
      errorText.includes('valid record type') ||
      errorText.includes('invalid_params') ||
      errorText.includes('invalid params');
    if (!shouldContinue) {
      return result;
    }
  }

  let refreshedCandidates: unknown[] = [];
  try {
    refreshedCandidates = await resolveEscrowSpendRecordInputs({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      payeeAddress,
      forceRefresh: true,
    });
  } catch {
    refreshedCandidates = [];
  }

  for (const candidate of refreshedCandidates) {
    pushAttempt(candidate);
  }

  const totalAttempts = Math.min(attemptInputs.length, 8);
  for (let index = maxAttempts; index < totalAttempts; index += 1) {
    const escrowInput = attemptInputs[index];
    const result = await executeEscrowTransition(executeTransaction, transactionStatus, {
      functionName: 'release_payment',
      inputs: [escrowInput, payeeAddress, completionProofField],
    });
    lastResult = result;
    if (result.success) return result;

    const errorText = String(result.error || '').toLowerCase();
    const shouldContinue =
      errorText.includes('valid record type') ||
      errorText.includes('invalid_params') ||
      errorText.includes('invalid params');
    if (!shouldContinue) {
      return result;
    }
  }

  return lastResult;
}

export async function refundEscrowWithWallet(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  requestRecords: RequestRecordsFn,
  payerAddress: string,
  escrowRecordId: string,
  refundReason: number = 0
): Promise<EscrowTransactionResult> {
  const rawEscrowRecordHint = String(escrowRecordId || '').trim();
  const normalizedEscrowRecordId = normalizeEscrowRecordId(escrowRecordId);
  if (!normalizedEscrowRecordId && !isRecordLikeInput(rawEscrowRecordHint)) {
    return {
      success: false,
      error: 'Escrow record ID is required to refund escrow.',
    };
  }

  const funding = await ensureWalletFeeFunding(
    executeTransaction,
    transactionStatus,
    requestRecords,
    payerAddress,
    ESCROW_PRIORITY_FEE
  );
  if (!funding.success) {
    return {
      success: false,
      error: funding.error || 'Unable to prepare private credits for refund fee.',
    };
  }

  const normalizedReason = refundReason === 1 ? 1 : 0;

  let initialEscrowInput: unknown | null = null;
  let initialCandidates: unknown[] = [];
  try {
    initialEscrowInput = await resolveEscrowSpendRecordInput({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      forceRefresh: false,
    });
    initialCandidates = await resolveEscrowSpendRecordInputs({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      forceRefresh: false,
    });
  } catch (error) {
    const message = extractWalletErrorMessage(error).toLowerCase();
    const fallbackHintInput = isRecordLikeInput(rawEscrowRecordHint) ? rawEscrowRecordHint : '';

    if (fallbackHintInput) {
      initialEscrowInput = fallbackHintInput;
      initialCandidates = [];
      console.warn('[escrow-transactions] Falling back to provided escrow hint after wallet record read failure (refund).', {
        payerAddress,
        reason: message,
      });
    } else if (message.includes('wallet_escrow_record_access_not_granted')) {
      return {
        success: false,
        error: 'Leo Wallet denied escrow record sharing (NOT_GRANTED). Re-open wallet prompt and click Confirm for escrow_v4.aleo records.',
      };
    } else {
      return {
        success: false,
        error: `Unable to read escrow record from wallet: ${extractWalletErrorMessage(error)}`,
      };
    }
  }

  const attemptInputs: unknown[] = [];
  const seen = new Set<string>();
  const pushAttempt = (value: unknown) => {
    const variants = buildEscrowAttemptVariants(value);
    for (const variant of variants) {
      const executableInput: unknown = sanitizeEscrowExecutableInput(variant);
      if (!isRecordLikeInput(executableInput)) continue;
      const key = toCandidateText(executableInput);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      attemptInputs.push(executableInput);
    }
  };

  pushAttempt(initialEscrowInput);
  for (const candidate of initialCandidates) {
    pushAttempt(candidate);
  }
  for (const hintCandidate of buildEscrowHintInputs(rawEscrowRecordHint, normalizedEscrowRecordId)) {
    pushAttempt(hintCandidate);
  }

  if (!attemptInputs.length) {
    console.warn('[escrow-transactions] No spendable escrow inputs resolved for refund.', {
      payerAddress,
      hint: normalizedEscrowRecordId || rawEscrowRecordHint,
      initialEscrowInputType: typeof initialEscrowInput,
      initialCandidatesCount: initialCandidates.length,
    });
    return {
      success: false,
      error: 'No spendable escrow record found in this wallet account. Connect the same wallet/account that locked escrow, then sync and retry.',
    };
  }

  let lastResult: EscrowTransactionResult = {
    success: false,
    error: 'No valid escrow record candidates found.',
  };

  const maxAttempts = Math.min(attemptInputs.length, 5);
  for (let index = 0; index < maxAttempts; index += 1) {
    const escrowInput = attemptInputs[index];
    const result = await executeEscrowTransition(executeTransaction, transactionStatus, {
      functionName: 'refund_payment',
      inputs: [escrowInput, `${normalizedReason}u8`],
    });
    lastResult = result;
    if (result.success) return result;

    const errorText = String(result.error || '').toLowerCase();
    const shouldContinue =
      errorText.includes('valid record type') ||
      errorText.includes('invalid_params') ||
      errorText.includes('invalid params');
    if (!shouldContinue) {
      return result;
    }
  }

  let refreshedCandidates: unknown[] = [];
  try {
    refreshedCandidates = await resolveEscrowSpendRecordInputs({
      requestRecords,
      payerAddress,
      escrowRecordHint: normalizedEscrowRecordId || rawEscrowRecordHint,
      forceRefresh: true,
    });
  } catch {
    refreshedCandidates = [];
  }

  for (const candidate of refreshedCandidates) {
    pushAttempt(candidate);
  }

  const totalAttempts = Math.min(attemptInputs.length, 8);
  for (let index = maxAttempts; index < totalAttempts; index += 1) {
    const escrowInput = attemptInputs[index];
    const result = await executeEscrowTransition(executeTransaction, transactionStatus, {
      functionName: 'refund_payment',
      inputs: [escrowInput, `${normalizedReason}u8`],
    });
    lastResult = result;
    if (result.success) return result;

    const errorText = String(result.error || '').toLowerCase();
    const shouldContinue =
      errorText.includes('valid record type') ||
      errorText.includes('invalid_params') ||
      errorText.includes('invalid params');
    if (!shouldContinue) {
      return result;
    }
  }

  return lastResult;
}

export async function submitWorkProofWithWallet(
  executeTransaction: ExecuteTransaction,
  transactionStatus: WalletTransactionStatusFn,
  seekerAddress: string,
  jobId: string,
  proofInput: string
): Promise<EscrowTransactionResult> {
  const normalizedSeeker = String(seekerAddress || '').trim();
  const normalizedJobId = String(jobId || '').trim();
  const normalizedProofInput = String(proofInput || '').trim();

  if (!normalizedSeeker || !normalizedJobId || !normalizedProofInput) {
    return {
      success: false,
      error: 'Seeker address, job ID, and proof input are required.',
    };
  }

  const proofField = toAleoField(normalizedProofInput);

  const result = await executeEscrowTransition(executeTransaction, transactionStatus, {
    functionName: 'submit_work_proof',
    inputs: [normalizedSeeker, toAleoField(normalizedJobId), proofField],
  });

  if (!result.success) {
    return result;
  }

  return {
    ...result,
    proofField,
  };
}

