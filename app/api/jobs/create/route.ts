import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

type CreateJobBody = {
  aleoAddress?: string;
  title?: string;
  description?: string;
  skills?: unknown;
  budget?: string;
  budgetMin?: number | string;
  budgetMax?: number | string;
  zkMembershipHash?: string;
  zkPaymentHash?: string;
};

function parseBudget(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((skill) => String(skill || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CreateJobBody;
    const aleoAddress = String(body.aleoAddress || request.headers.get('x-aleo-address') || '').trim().toLowerCase();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const skills = normalizeSkills(body.skills);
    const budgetMin = parseBudget(body.budgetMin);
    const budgetMax = parseBudget(body.budgetMax);
    const providedBudget = String(body.budget || '').trim();
    const zkMembershipHash = String(body.zkMembershipHash || body.zkPaymentHash || '').trim();

    if (!aleoAddress || !title || !description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: aleoAddress, title, description.' },
        { status: 400 }
      );
    }

    const resolvedBudget =
      budgetMin !== null && budgetMax !== null
        ? `${budgetMin}-${budgetMax} credits`
        : providedBudget || null;

    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      return NextResponse.json(
        { success: false, message: 'Minimum budget cannot exceed maximum budget.' },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, message: `Failed to resolve profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    if (!profile?.id) {
      return NextResponse.json(
        { success: false, message: 'Wallet profile not found. Please register your role first.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'giver') {
      return NextResponse.json(
        { success: false, message: 'This wallet is not registered as a giver.' },
        { status: 403 }
      );
    }

    // Best-effort backfill for older rows. Ignore failure because some deployments may not include this column.
    await supabaseAdmin
      .from('profiles')
      .update({
        role: 'giver',
        role_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        giver_id: profile.id,
        title,
        description,
        skills,
        budget: resolvedBudget,
        is_active: true,
        zk_membership_hash: zkMembershipHash || `proof:pending:${Date.now()}`,
      })
      .select('id, title, budget, created_at')
      .single();

    if (jobError) {
      return NextResponse.json(
        { success: false, message: `Failed to post job: ${jobError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job posted successfully.',
      data: { job },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create job' },
      { status: 500 }
    );
  }
}
