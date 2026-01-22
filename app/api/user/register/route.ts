// API Route: User Registration
// POST /api/user/register

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { verifyZKProofHash, isZKHashUnique } from '@/lib/aleoProofVerifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { aleoAddress, role, zkMembershipHash } = body;

    // Validation
    if (!aleoAddress || !role || !zkMembershipHash) {
      return NextResponse.json(
        { error: 'Missing required fields: aleoAddress, role, zkMembershipHash' },
        { status: 400 }
      );
    }

    if (!['giver', 'seeker'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "giver" or "seeker"' },
        { status: 400 }
      );
    }

    // Verify ZK proof hash format
    if (!/^[a-f0-9]{64}$/i.test(zkMembershipHash)) {
      return NextResponse.json(
        { error: 'Invalid ZK proof hash format' },
        { status: 400 }
      );
    }

    // Verify ZK proof hash corresponds to valid Aleo transaction
    const expectedProgram = 'access_control.aleo';
    const expectedFunction = role === 'giver' ? 'pay_job_giver_access' : 'pay_job_seeker_access';
    
    const isValidProof = await verifyZKProofHash(
      zkMembershipHash,
      expectedProgram,
      expectedFunction,
      aleoAddress
    );

    if (!isValidProof) {
      return NextResponse.json(
        { error: 'Invalid or unverified ZK proof hash' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .single();

    if (existingUser) {
      // User exists - update role if different
      if (existingUser.role !== role) {
        await supabaseAdmin
          .from('users')
          .update({ role })
          .eq('id', existingUser.id);
      }

      return NextResponse.json({
        success: true,
        message: 'User already registered',
        user: {
          id: existingUser.id,
          aleoAddress,
          role,
        },
      });
    }

    // Create new user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        aleo_address: aleoAddress,
        role,
        reputation_score: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        aleoAddress: newUser.aleo_address,
        role: newUser.role,
        reputationScore: newUser.reputation_score,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user', message: error.message },
      { status: 500 }
    );
  }
}

