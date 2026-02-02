// Alternative API Route: Refund Escrow Payment
// POST /api/escrows/:id/refund

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { refundEscrow } from '@/lib/escrow-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const escrowId = params.id;
    const body = await request.json();
    const { employerPrivateKey, aleoAddress, refundReason = 0 } = body;

    // Validation
    if (!escrowId || !employerPrivateKey || !aleoAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employerPrivateKey, aleoAddress' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Verify user exists and get employer ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please ensure you are authenticated.' },
        { status: 404 }
      );
    }

    // Call service layer function
    const result = await refundEscrow(escrowId, user.id, employerPrivateKey, refundReason);

    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 500;
      if (result.error?.includes('not found')) statusCode = 404;
      if (result.error?.includes('do not own')) statusCode = 403;
      if (result.error?.includes('already processed') || result.error?.includes('already exists') || result.error?.includes('Cannot refund')) statusCode = 400;

      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      escrowId: result.escrowId,
      status: result.status,
    });
  } catch (error: any) {
    console.error('[API] Refund escrow error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to refund escrow' },
      { status: 500 }
    );
  }
}




