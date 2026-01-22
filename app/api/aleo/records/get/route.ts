// API Route: Get Records for an Address
// GET /api/aleo/records/get?address=<address>&programId=<optional>

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const programId = searchParams.get('programId') || undefined;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const records = await aleoService.getRecords(address, programId);

    return NextResponse.json({
      address,
      programId: programId || 'all',
      records,
      count: records.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get records', message: error.message },
      { status: 500 }
    );
  }
}






