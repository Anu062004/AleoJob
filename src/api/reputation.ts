import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

type MarketplaceRole = 'seeker' | 'giver';

type ReputationBreakdown = {
  email: number;
  qualification: number;
  experience: number;
  cv: number;
  completedJobs: number;
  jobsPosted: number;
  escrowGenerated: number;
  total: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calcSeekerScore(input: {
  hasEmail: boolean;
  hasQualification: boolean;
  experienceYears: number;
  hasCv: boolean;
  completedJobs: number;
}): ReputationBreakdown {
  const email = input.hasEmail ? 15 : 0;
  const qualification = input.hasQualification ? 25 : 0;
  const experience = Math.min(20, Math.max(0, Math.floor(input.experienceYears)) * 4);
  const cv = input.hasCv ? 20 : 0;
  const completedJobs = Math.min(20, Math.max(0, Math.floor(input.completedJobs)) * 4);
  const total = Math.min(100, email + qualification + experience + cv + completedJobs);

  return {
    email,
    qualification,
    experience,
    cv,
    completedJobs,
    jobsPosted: 0,
    escrowGenerated: 0,
    total,
  };
}

function calcGiverScore(input: { jobsPosted: number; totalEscrowGenerated: number }): ReputationBreakdown {
  const jobsPosted = Math.min(60, Math.max(0, Math.floor(input.jobsPosted)) * 12);
  const escrowGenerated = Math.min(40, Math.floor(Math.max(0, input.totalEscrowGenerated) * 2));
  const total = Math.min(100, jobsPosted + escrowGenerated);

  return {
    email: 0,
    qualification: 0,
    experience: 0,
    cv: 0,
    completedJobs: 0,
    jobsPosted,
    escrowGenerated,
    total,
  };
}

async function getCount(table: string, filters: Array<[string, unknown]>): Promise<number> {
  if (!supabaseAdmin) return 0;

  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
  for (const [field, value] of filters) {
    query = query.eq(field, value as never);
  }
  const { count } = await query;
  return toSafeNumber(count, 0);
}

async function getEscrowTotalForEmployer(employerId: string): Promise<number> {
  if (!supabaseAdmin) return 0;

  const { data, error } = await supabaseAdmin
    .from('escrows')
    .select('amount')
    .eq('employer_id', employerId);

  if (error || !data) return 0;
  return data.reduce((sum, row: any) => sum + toSafeNumber(row.amount, 0), 0);
}

export async function handleRecalculateReputation(req: Request, res: Response) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Database not configured.',
      });
    }

    const { aleoAddress } = req.body || {};
    const normalizedAddress = String(aleoAddress || '').trim();

    if (!normalizedAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: aleoAddress',
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, education_level, experience_years')
      .eq('aleo_address', normalizedAddress)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found for this wallet',
      });
    }

    const role = profile.role as MarketplaceRole | null;
    if (role !== 'seeker' && role !== 'giver') {
      return res.status(400).json({
        success: false,
        error: 'Wallet role is not assigned. Complete role onboarding first.',
      });
    }

    const jobsPostedCount = await getCount('jobs', [['giver_id', profile.id]]);
    const totalEscrowGenerated = await getEscrowTotalForEmployer(profile.id);
    const completedJobsCount = await getCount('escrows', [
      ['freelancer_id', profile.id],
      ['status', 'released'],
    ]);
    const cvCount = await getCount('cvs', [['user_id', profile.id]]);
    const hasCv = cvCount > 0;

    const breakdown =
      role === 'seeker'
        ? calcSeekerScore({
            hasEmail: Boolean(String(profile.email || '').trim()),
            hasQualification: Boolean(String(profile.education_level || '').trim()),
            experienceYears: toSafeNumber(profile.experience_years, 0),
            hasCv,
            completedJobs: completedJobsCount,
          })
        : calcGiverScore({
            jobsPosted: jobsPostedCount,
            totalEscrowGenerated,
          });

    const updates = {
      profile_score: breakdown.total,
      jobs_posted: jobsPostedCount,
      total_escrow_generated: Number(totalEscrowGenerated.toFixed(4)),
      completed_jobs: completedJobsCount,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin.from('profiles').update(updates).eq('id', profile.id);
    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message || 'Failed to update profile reputation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        aleoAddress: normalizedAddress,
        role,
        score: breakdown.total,
        metrics: {
          jobsPosted: jobsPostedCount,
          totalEscrowGenerated: Number(totalEscrowGenerated.toFixed(4)),
          completedJobs: completedJobsCount,
          hasCv,
        },
        breakdown,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to recalculate reputation',
    });
  }
}

