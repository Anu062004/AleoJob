// API Route: Get Wallet Balance
// GET /api/aleo/wallet/balance?address=<address>

import { NextRequest, NextResponse } from 'next/server';
import { aleoService } from '@/lib/aleo-service';

export async function GET(request: NextRequest) {
  console.log('🔵 [API] Balance endpoint called');
  console.log('🔵 [API] Request URL:', request.url);
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    
    console.log('🔵 [API] Address parameter:', address);

    if (!address) {
      console.log('❌ [API] No address provided');
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔵 [API] Calling aleoService.getBalance...');
    const balance = await aleoService.getBalance(address);
    console.log('🔵 [API] Balance retrieved:', balance);

    const response = {
      address,
      balance,
      unit: 'testnet_credits', // Explicitly testnet credits
      network: 'testnet', // Network identifier
    };
    
    console.log('✅ [API] Returning response:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [API] Error in balance endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get balance', message: error.message },
      { status: 500 }
    );
  }
}


