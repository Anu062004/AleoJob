// API Route: Connect Wallet / Get Wallet Info
// GET /api/aleo/wallet/connect

import { NextResponse } from 'next/server';
import { ALEO_CONFIG } from '@/lib/aleo-config';

export async function GET() {
  try {
    // Return public configuration (safe for browser)
    return NextResponse.json({
      network: ALEO_CONFIG.network,
      endpoint: ALEO_CONFIG.endpoint,
      programs: ALEO_CONFIG.programs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get wallet configuration', message: error.message },
      { status: 500 }
    );
  }
}






