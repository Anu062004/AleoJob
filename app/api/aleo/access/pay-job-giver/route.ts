// API Route: Pay for Job Giver Access
// POST /api/aleo/access/pay-job-giver

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient, privateKey } = body;

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient address is required' },
        { status: 400 }
      );
    }

    // Use private key from request or fall back to server-side env variable
    // Note: In production, consider using wallet adapter's requestTransaction for better security
    const keyToUse = privateKey || process.env.ALEO_PRIVATE_KEY;
    
    if (!keyToUse) {
      return NextResponse.json(
        { error: 'Private key is required (provide in request or set ALEO_PRIVATE_KEY env var)' },
        { status: 400 }
      );
    }

    // Execute transition on Aleo blockchain (deducts 3 credits)
    const transaction = await aleoService.payJobGiverAccess(recipient, keyToUse);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.transactionId,
        status: transaction.status,
      },
      message: 'Job giver access payment submitted',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process payment', message: error.message },
      { status: 500 }
    );
  }
}






