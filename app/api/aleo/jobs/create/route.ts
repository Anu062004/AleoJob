// API Route: Create a Job
// POST /api/aleo/jobs/create

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, budgetMin, budgetMax, deadlineBlock, privateKey } = body;

    if (!owner || budgetMin === undefined || budgetMax === undefined || !deadlineBlock || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, budgetMin, budgetMax, deadlineBlock, privateKey' },
        { status: 400 }
      );
    }

    try {
      const transaction = await aleoService.createJob(
        owner,
        budgetMin,
        budgetMax,
        deadlineBlock,
        privateKey
      );

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.transactionId,
          status: transaction.status,
        },
        message: 'Job creation transaction submitted',
      });
    } catch (chainError: any) {
      console.error('[jobs/create] Aleo chain error, falling back to mock:', chainError?.message || chainError);
      // Fallback mock so the UI can continue while on-chain deploy is unavailable.
      return NextResponse.json({
        success: true,
        transaction: {
          id: `mock-${Date.now()}`,
          status: 'pending-mock',
        },
        message: 'Job created in mock mode (on-chain deploy unavailable right now)',
        mock: true,
      }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create job', message: error.message },
      { status: 500 }
    );
  }
}


