import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function parseAdminAddresses(): Set<string> {
  const raw =
    process.env.OPS_ADMIN_ADDRESSES ||
    process.env.VITE_OPS_ADMIN_ADDRESSES ||
    '';

  const values = raw
    .split(',')
    .map((address) => normalizeAddress(address))
    .filter(Boolean);

  return new Set(values);
}

const OPS_ADMIN_ADDRESSES = parseAdminAddresses();

export function hasOpsAdminAllowlist(): boolean {
  return OPS_ADMIN_ADDRESSES.size > 0;
}

export function isOpsAdminAddress(aleoAddress: string): boolean {
  const normalized = normalizeAddress(aleoAddress);
  if (!normalized) return false;
  return OPS_ADMIN_ADDRESSES.has(normalized);
}

export function getRequesterAleoAddress(req: Request): string {
  const bodyAddress = normalizeAddress((req.body || {}).aleoAddress);
  if (bodyAddress) return bodyAddress;

  const headerAddress = normalizeAddress(req.header('x-aleo-address'));
  if (headerAddress) return headerAddress;

  const queryAddress = req.query?.aleoAddress;
  if (typeof queryAddress === 'string') {
    return normalizeAddress(queryAddress);
  }

  return '';
}

export function normalizeEscrowIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export async function findProfileIdByAleoAddress(
  supabaseAdmin: SupabaseClient<any, any, any>,
  aleoAddress: string
): Promise<string | null> {
  const normalized = normalizeAddress(aleoAddress);
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('aleo_address', normalized)
    .single();

  if (error || !data?.id) {
    return null;
  }

  return data.id as string;
}

export async function filterEscrowIdsOwnedByProfile(
  supabaseAdmin: SupabaseClient<any, any, any>,
  escrowIds: string[],
  employerProfileId: string
): Promise<string[]> {
  if (!escrowIds.length || !employerProfileId) {
    return [];
  }

  const normalizedEscrowIds = Array.from(
    new Set(
      escrowIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );

  if (!normalizedEscrowIds.length) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('escrows')
    .select('id')
    .eq('employer_id', employerProfileId)
    .in('id', normalizedEscrowIds);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) => String(row.id || '').trim())
    .filter(Boolean);
}
