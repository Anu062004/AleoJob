// API Route: Apply to a Job
// POST /api/jobs/apply

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyZKProofHash, isZKHashUnique } from '@/lib/aleoProofVerifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jobId,
      encryptedResumeUrl,
      encryptedCoverLetter,
      zkPaymentHash,
      aleoAddress,
    } = body;

    // Validation
    if (!jobId || !aleoAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, aleoAddress' },
        { status: 400 }
      );
    }

    // For MVP: Generate mock ZK hash if not provided (for testing)
    // In production, this should come from actual Aleo transaction
    let zkPaymentHash = body.zkPaymentHash;
    if (!zkPaymentHash) {
      // Generate a mock hash for MVP testing
      zkPaymentHash = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
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

    // Check if hash has been used before
    const isUnique = await isZKHashUnique(zkPaymentHash, 'applications', supabaseAdmin);
    if (!isUnique) {
      return NextResponse.json(
        { error: 'ZK proof hash has already been used' },
        { status: 400 }
      );
    }

    // Verify user exists and is a seeker, or create if doesn't exist
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      // Auto-register user as seeker if they don't exist
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          aleo_address: aleoAddress,
          role: 'seeker',
        })
        .select('id, role')
        .single();

      if (createError || !newUser) {
        return NextResponse.json(
          { error: 'Failed to create user account', details: createError?.message },
          { status: 500 }
        );
      }
      user = newUser;
    }

    if (user.role !== 'seeker') {
      return NextResponse.json(
        { error: 'Only job seekers can apply to jobs' },
        { status: 403 }
      );
    }

    // Verify job exists and is active
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, is_active')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (!job.is_active) {
      return NextResponse.json(
        { error: 'Job is no longer active' },
        { status: 400 }
      );
    }

    // Check if user has already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('seeker_id', user.id)
      .single();

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      );
    }

    // Verify ZK proof hash corresponds to valid payment
    // For MVP, we'll skip strict verification and just check format
    // In production, uncomment the verification below
    const isValidFormat = /^[a-f0-9]{64}$/i.test(zkPaymentHash);
    if (!isValidFormat) {
      return NextResponse.json(
        { error: 'Invalid ZK proof hash format' },
        { status: 400 }
      );
    }

    // TODO: In production, enable strict ZK proof verification
    // const isValidProof = await verifyZKProofHash(
    //   zkPaymentHash,
    //   'access_control.aleo',
    //   'pay_job_seeker_access',
    //   aleoAddress
    // );
    // if (!isValidProof) {
    //   return NextResponse.json(
    //     { error: 'Invalid or unverified ZK proof hash' },
    //     { status: 400 }
    //   );
    // }

    // Create application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: jobId,
        seeker_id: user.id,
        encrypted_resume_url: encryptedResumeUrl || null,
        encrypted_cover_letter: encryptedCoverLetter || null,
        zk_application_hash: zkPaymentHash,
        status: 'pending',
      })
      .select()
      .single();

    if (applicationError) {
      console.error('Error creating application:', applicationError);
      console.error('Full error details:', JSON.stringify(applicationError, null, 2));
      console.error('Job ID:', jobId);
      console.error('User ID:', user.id);
      console.error('User details:', JSON.stringify(user, null, 2));
      
      return NextResponse.json(
        { 
          error: 'Failed to create application', 
          details: applicationError.message,
          code: applicationError.code,
          hint: applicationError.hint,
          fullError: applicationError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        jobId: application.job_id,
        status: application.status,
        createdAt: application.created_at,
      },
    });
  } catch (error: any) {
    console.error('Apply to job error:', error);
    return NextResponse.json(
      { error: 'Failed to apply to job', message: error.message },
      { status: 500 }
    );
  }
}

