import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeList<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export async function handleGetGiverJobs(req: Request, res: Response) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Database not configured.',
      });
    }

    const bodyAddress = normalizeAddress((req.body || {}).aleoAddress);
    const headerAddress = normalizeAddress(req.header('x-aleo-address'));
    const aleoAddress = bodyAddress || headerAddress;

    if (!aleoAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: aleoAddress',
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: `Failed to resolve profile: ${profileError.message}`,
      });
    }

    if (!profile?.id) {
      return res.status(404).json({
        success: false,
        message: 'Wallet profile not found.',
      });
    }

    if (profile.role !== 'giver') {
      return res.status(403).json({
        success: false,
        message: 'This wallet is not registered as a giver.',
      });
    }

    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(
        `
          id,
          title,
          description,
          skills,
          budget,
          is_active,
          created_at,
          payment_status,
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

    if (jobsError) {
      return res.status(500).json({
        success: false,
        message: `Failed to load giver jobs: ${jobsError.message}`,
      });
    }

    const normalizedJobs = (jobs || []).map((job: any) => ({
      ...job,
      applications: normalizeList(job?.applications),
      escrows: normalizeList(job?.escrows),
    }));

    return res.status(200).json({
      success: true,
      data: {
        jobs: normalizedJobs,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch giver jobs',
    });
  }
}
