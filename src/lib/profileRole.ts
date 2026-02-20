import { createSupabaseClientWithToken } from '@/lib/supabaseClient';

export type MarketplaceRole = 'seeker' | 'giver';

export interface MarketplaceProfile {
  id: string;
  aleo_address: string;
  role: MarketplaceRole | null;
  role_locked: boolean;
  email: string | null;
  education_level: string | null;
  experience_years: number;
  profile_score: number;
  jobs_posted: number;
  total_escrow_generated: number;
  completed_jobs: number;
}

type ProfileSeed = {
  email?: string | null;
  educationLevel?: string | null;
  experienceYears?: number | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProfile(row: any): MarketplaceProfile {
  return {
    id: String(row.id),
    aleo_address: String(row.aleo_address),
    role: row.role === 'seeker' || row.role === 'giver' ? row.role : null,
    role_locked: Boolean(row.role_locked),
    email: row.email ? String(row.email) : null,
    education_level: row.education_level ? String(row.education_level) : null,
    experience_years: toNumber(row.experience_years, 0),
    profile_score: toNumber(row.profile_score, 0),
    jobs_posted: toNumber(row.jobs_posted, 0),
    total_escrow_generated: toNumber(row.total_escrow_generated, 0),
    completed_jobs: toNumber(row.completed_jobs, 0),
  };
}

const PROFILE_SELECT = `
  id,
  aleo_address,
  role,
  role_locked,
  email,
  education_level,
  experience_years,
  profile_score,
  jobs_posted,
  total_escrow_generated,
  completed_jobs
`;

export async function fetchMarketplaceProfile(aleoAddress: string): Promise<MarketplaceProfile | null> {
  if (!aleoAddress) return null;
  const client = createSupabaseClientWithToken(aleoAddress);

  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('aleo_address', aleoAddress)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeProfile(data) : null;
}

export async function ensureWalletRole(
  aleoAddress: string,
  desiredRole: MarketplaceRole,
  seed: ProfileSeed = {}
): Promise<MarketplaceProfile> {
  if (!aleoAddress) {
    throw new Error('A wallet address is required.');
  }

  const client = createSupabaseClientWithToken(aleoAddress);
  const existing = await fetchMarketplaceProfile(aleoAddress);

  if (existing?.role && existing.role !== desiredRole) {
    throw new Error(`This wallet is already locked as ${existing.role}.`);
  }

  if (!existing) {
    const insertPayload: Record<string, unknown> = {
      aleo_address: aleoAddress,
      role: desiredRole,
      role_locked: true,
    };

    if (typeof seed.email === 'string') {
      insertPayload.email = seed.email.trim() || null;
    }
    if (typeof seed.educationLevel === 'string') {
      insertPayload.education_level = seed.educationLevel.trim() || null;
    }
    if (typeof seed.experienceYears === 'number') {
      insertPayload.experience_years = Math.max(0, Math.floor(seed.experienceYears));
    }

    const { data, error } = await client
      .from('profiles')
      .insert(insertPayload)
      .select(PROFILE_SELECT)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Unable to create wallet profile.');
    }

    return normalizeProfile(data);
  }

  if (existing.role === desiredRole && existing.role_locked) {
    return existing;
  }

  const updates: Record<string, unknown> = {
    role: desiredRole,
    role_locked: true,
    updated_at: new Date().toISOString(),
  };

  if (typeof seed.email === 'string') {
    updates.email = seed.email.trim() || null;
  }
  if (typeof seed.educationLevel === 'string') {
    updates.education_level = seed.educationLevel.trim() || null;
  }
  if (typeof seed.experienceYears === 'number') {
    updates.experience_years = Math.max(0, Math.floor(seed.experienceYears));
  }

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', existing.id)
    .select(PROFILE_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Unable to lock wallet role.');
  }

  return normalizeProfile(data);
}

export function isSeekerOnboardingComplete(profile: MarketplaceProfile | null, hasCv: boolean): boolean {
  if (!profile) return false;
  if (profile.role !== 'seeker') return false;

  const hasEmail = Boolean(profile.email && profile.email.trim());
  const hasQualification = Boolean(profile.education_level && profile.education_level.trim());
  const hasExperience = profile.experience_years >= 0;

  return hasEmail && hasQualification && hasExperience && hasCv;
}

