function normalizeAddress(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

function parseAdminAddresses(): Set<string> {
  const raw = import.meta.env.VITE_OPS_ADMIN_ADDRESSES || '';

  const values = raw
    .split(',')
    .map((address: string) => normalizeAddress(address))
    .filter(Boolean);

  return new Set(values);
}

const OPS_ADMIN_ADDRESSES = parseAdminAddresses();

export function hasOpsAdminAllowlist(): boolean {
  return OPS_ADMIN_ADDRESSES.size > 0;
}

export function isOpsAdminAddress(aleoAddress: string | null | undefined): boolean {
  const normalized = normalizeAddress(aleoAddress);
  if (!normalized) return false;
  return OPS_ADMIN_ADDRESSES.has(normalized);
}
