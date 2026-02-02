// API Route: Get Escrow Status
// GET /api/aleo/escrow/status

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { aleoService } from '@/lib/aleo-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const escrowId = searchParams.get('escrowId');
    const jobId = searchParams.get('jobId');

    if (!escrowId && !jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing escrowId or jobId parameter' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Fetch escrow from database
    let query = supabaseAdmin.from('escrows').select('*');
    
    if (escrowId) {
      query = query.eq('id', escrowId);
    } else if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: escrow, error: escrowError } = await query.single();

    if (escrowError || !escrow) {
      return NextResponse.json(
        { success: false, error: 'Escrow not found' },
        { status: 404 }
      );
    }

    // Optionally verify on-chain status
    // For now, we'll return the database status
    // In production, you might want to cross-check with Aleo

    return NextResponse.json({
      success: true,
      escrow: {
        id: escrow.id,
        jobId: escrow.job_id,
        status: escrow.status,
        amount: escrow.amount,
        createTx: escrow.create_tx,
        releaseTx: escrow.release_tx,
        refundTx: escrow.refund_tx,
        createdAt: escrow.created_at,
        updatedAt: escrow.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Get escrow status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get escrow status' },
      { status: 500 }
    );
  }
}




