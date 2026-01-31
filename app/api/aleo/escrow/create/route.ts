// API Route: Create Escrow
// POST /api/aleo/escrow/create

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { aleoService } from '@/lib/aleo-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, employerPrivateKey, freelancerAddress, amount, aleoAddress } = body;

    // Validation
    if (!jobId || !employerPrivateKey || !freelancerAddress || !amount || !aleoAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Verify user exists - use profiles table
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify job exists and belongs to employer
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, giver_id, payment_status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.giver_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not own this job' },
        { status: 403 }
      );
    }

    // Prevent double escrow creation
    if (job.payment_status === 'locked' || job.payment_status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Escrow already exists for this job' },
        { status: 400 }
      );
    }

    // Verify freelancer exists - use profiles table
    const { data: freelancer, error: freelancerError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('aleo_address', freelancerAddress)
      .single();

    if (freelancerError || !freelancer) {
      return NextResponse.json(
        { success: false, error: 'Freelancer not found' },
        { status: 404 }
      );
    }

    // Create escrow on Aleo
    const escrowResult = await aleoService.createEscrow(
      jobId,
      employerPrivateKey,
      freelancerAddress,
      amount
    );

    if (!escrowResult.success) {
      return NextResponse.json(
        { success: false, error: escrowResult.error || 'Failed to create escrow on Aleo' },
        { status: 500 }
      );
    }

    // Store escrow in database
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .insert({
        job_id: jobId,
        employer_id: user.id,
        freelancer_id: freelancer.id,
        amount,
        status: 'locked',
        escrow_record_id: escrowResult.escrowId,
        create_tx: escrowResult.transactionId,
      })
      .select()
      .single();

    if (escrowError) {
      console.error('Error creating escrow in database:', escrowError);
      return NextResponse.json(
        { success: false, error: 'Failed to store escrow record' },
        { status: 500 }
      );
    }

    // Update job payment status
    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ payment_status: 'locked' })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job payment status:', updateError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      transactionId: escrowResult.transactionId,
      escrowId: escrow.id,
      escrowRecordId: escrowResult.escrowId,
    });
  } catch (error: any) {
    console.error('Create escrow error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create escrow' },
      { status: 500 }
    );
  }
}

