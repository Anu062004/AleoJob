// API Route: Apply to a Job
// POST /api/aleo/jobs/apply

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, applicant, jobPosting, proposedBudget, privateKey } = body;

    if (!owner || !applicant || !jobPosting || proposedBudget === undefined || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, applicant, jobPosting, proposedBudget, privateKey' },
        { status: 400 }
      );
    }

    try {
      const transaction = await aleoService.applyToJob(
        owner,
        applicant,
        jobPosting,
        proposedBudget,
        privateKey
      );

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.transactionId,
          status: transaction.status,
        },
        message: 'Job application submitted (1 credit deducted)',
      });
    } catch (chainError: any) {
      console.error('[jobs/apply] Aleo chain error:', chainError?.message || chainError);
      return NextResponse.json(
        { error: 'Failed to apply to job', message: chainError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process application', message: error.message },
      { status: 500 }
    );
  }
}

