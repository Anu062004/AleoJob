// API Route: Get Transaction Status
// GET /api/aleo/transaction/status?transactionId=<id>

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID parameter is required' },
        { status: 400 }
      );
    }

    const status = await aleoService.getTransactionStatus(transactionId);

    return NextResponse.json({
      transactionId,
      status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get transaction status', message: error.message },
      { status: 500 }
    );
  }
}






