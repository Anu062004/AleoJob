const RECORD_COMMITMENT_PATTERN = /record1[0-9a-z]+/i;
const FIELD_TOKEN_PATTERN = /^[0-9]+field$/i;
const ESCROW_REQUIRED_KEYS = ['owner', 'payer', 'payee', 'amount', 'job_id', 'status'] as const;

function extractFromString(input: string): string {
  const normalized = String(input || '').trim();
  if (!normalized) return '';
  const match = normalized.match(RECORD_COMMITMENT_PATTERN);
  return match?.[0]?.trim() || '';
}

function looksLikePlainEscrowRecordText(input: string): boolean {
  const normalized = String(input || '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('owner') &&
    normalized.includes('payer') &&
    normalized.includes('payee') &&
    normalized.includes('amount') &&
    normalized.includes('job_id') &&
    normalized.includes('status')
  );
}

function isRecordReferenceObject(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;

  const value = input as Record<string, unknown>;
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  const hasEscrowPayloadShape = ESCROW_REQUIRED_KEYS.every((key) => keys.includes(key));
  if (hasEscrowPayloadShape) return true;

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
  const hasFieldToken = FIELD_TOKEN_PATTERN.test(id) || FIELD_TOKEN_PATTERN.test(tag) || FIELD_TOKEN_PATTERN.test(checksum);
  const hasRecordishType = type.includes('record') || keys.some((key) => key.includes('record'));

  if (hasRecordishType && hasFieldToken) return true;
  if (FIELD_TOKEN_PATTERN.test(id) && FIELD_TOKEN_PATTERN.test(tag)) return true;
  return false;
}

export function isSpendableEscrowRecordReference(input: unknown): boolean {
  if (!input) return false;

  if (typeof input === 'string') {
    const normalized = input.trim();
    if (!normalized) return false;

    if (normalized.startsWith('{') || normalized.startsWith('[')) {
      try {
        const parsed = JSON.parse(normalized);
        return isSpendableEscrowRecordReference(parsed);
      } catch {
        return looksLikePlainEscrowRecordText(normalized);
      }
    }

    return looksLikePlainEscrowRecordText(normalized);
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (isSpendableEscrowRecordReference(item)) return true;
    }
    return false;
  }

  return isRecordReferenceObject(input);
}

export function isRecordCommitment(value: unknown): boolean {
  return Boolean(extractFromString(String(value || '')));
}

export function extractRecordCommitmentToken(input: unknown, maxDepth = 8): string {
  const seenObjects = new WeakSet<object>();

  const visit = (value: unknown, depth: number): string => {
    if (depth > maxDepth || value === null || value === undefined) return '';

    if (typeof value === 'string') {
      const fromString = extractFromString(value);
      if (fromString) return fromString;

      const trimmed = value.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return visit(JSON.parse(trimmed), depth + 1);
        } catch {
          return '';
        }
      }

      return '';
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return '';
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = visit(item, depth + 1);
        if (nested) return nested;
      }
      return '';
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      if (seenObjects.has(objectValue)) return '';
      seenObjects.add(objectValue);

      try {
        const serialized = JSON.stringify(objectValue);
        const fromSerialized = extractFromString(serialized);
        if (fromSerialized) return fromSerialized;
      } catch {
        // Ignore serialization failure and continue scanning nested values.
      }

      const preferredKeys = [
        'value',
        'record',
        'record_plaintext',
        'recordPlaintext',
        'plaintext',
        'data',
        'escrow',
        'recordData',
        'fields',
        'payload',
        'id',
      ];

      for (const key of preferredKeys) {
        if (!Object.prototype.hasOwnProperty.call(objectValue, key)) continue;
        const nested = visit(objectValue[key], depth + 1);
        if (nested) return nested;
      }

      for (const nestedValue of Object.values(objectValue)) {
        const nested = visit(nestedValue, depth + 1);
        if (nested) return nested;
      }
    }

    return '';
  };

  return visit(input, 0);
}

export function normalizeEscrowRecordId(input: unknown): string {
  return extractRecordCommitmentToken(input);
}

export function normalizeEscrowRecordReference(input: unknown): string {
  if (input === null || input === undefined) return '';

  if (typeof input === 'string') {
    const normalized = input.trim();
    if (!normalized) return '';

    if (normalized.startsWith('{') || normalized.startsWith('[')) {
      try {
        const parsed = JSON.parse(normalized);
        const serialized = normalizeEscrowRecordReference(parsed);
        if (serialized) return serialized;
      } catch {
        // fall through
      }
    }

    if (looksLikePlainEscrowRecordText(normalized)) return normalized;

    const token = extractRecordCommitmentToken(normalized);
    return token || '';
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = normalizeEscrowRecordReference(item);
      if (nested) return nested;
    }
    return '';
  }

  if (typeof input === 'object') {
    if (isRecordReferenceObject(input)) {
      try {
        return JSON.stringify(input);
      } catch {
        // fall back to commitment extraction
      }
    }

    const token = extractRecordCommitmentToken(input);
    return token || '';
  }

  return '';
}

export function isUsableEscrowRecordReference(input: unknown): boolean {
  return Boolean(normalizeEscrowRecordReference(input));
}
