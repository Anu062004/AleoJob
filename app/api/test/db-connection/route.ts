// Test endpoint to verify database connection and insert test data
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured', configured: false },
        { status: 500 }
      );
    }

    // Test 1: Check connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        connected: false,
        error: testError.message,
        code: testError.code,
        details: testError,
      }, { status: 500 });
    }

    // Test 2: Try to insert a test user
    const testAddress = `test_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        aleo_address: testAddress,
        role: 'seeker',
        reputation_score: 0,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        connected: true,
        canRead: true,
        canInsert: false,
        insertError: insertError.message,
        code: insertError.code,
        details: insertError,
      }, { status: 500 });
    }

    // Test 3: Try to read it back
    const { data: readData, error: readError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('aleo_address', testAddress)
      .single();

    // Clean up test data
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('aleo_address', testAddress);

    return NextResponse.json({
      success: true,
      connected: true,
      canRead: true,
      canInsert: true,
      canDelete: true,
      testUser: insertData,
      readBack: readData,
      message: 'Database connection is working!',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}







