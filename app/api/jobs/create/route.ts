// API Route: Create a Job
// POST /api/jobs/create

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabaseServer';
import { verifyZKProofHash, isZKHashUnique } from '@/lib/aleoProofVerifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      skills, 
      budget, 
      zkPaymentHash,
      aleoAddress 
    } = body;

    // Validation
    if (!title || !description || !zkPaymentHash || !aleoAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, zkPaymentHash, aleoAddress' },
        { status: 400 }
      );
    }

    // Verify ZK proof hash format
    if (!/^[a-f0-9]{64}$/i.test(zkPaymentHash)) {
      return NextResponse.json(
        { error: 'Invalid ZK proof hash format' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Check if hash has been used before (prevent replay attacks)
    const isUnique = await isZKHashUnique(zkPaymentHash, 'jobs', supabaseAdmin);
    if (!isUnique) {
      return NextResponse.json(
        { error: 'ZK proof hash has already been used' },
        { status: 400 }
      );
    }

    // Verify user exists and is a giver
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      );
    }

    if (user.role !== 'giver') {
      return NextResponse.json(
        { error: 'Only job givers can create jobs' },
        { status: 403 }
      );
    }

    // Verify ZK proof hash corresponds to valid payment
    const isValidProof = await verifyZKProofHash(
      zkPaymentHash,
      'access_control.aleo',
      'pay_job_giver_access',
      aleoAddress
    );

    if (!isValidProof) {
      return NextResponse.json(
        { error: 'Invalid or unverified ZK proof hash' },
        { status: 400 }
      );
    }

    // Create job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        giver_id: user.id,
        title,
        description,
        skills: skills || [],
        budget: budget || null,
        is_active: true,
        zk_membership_hash: zkPaymentHash,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job created successfully',
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills,
        budget: job.budget,
        createdAt: job.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create job error:', error);
    return NextResponse.json(
      { error: 'Failed to create job', message: error.message },
      { status: 500 }
    );
  }
}

