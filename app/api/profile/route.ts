// API Route: Get and update user profile
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

// GET: Fetch profile
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const aleoAddress = searchParams.get('aleoAddress');

    if (!aleoAddress) {
      return NextResponse.json(
        { error: 'aleoAddress is required' },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        cv:cvs(id, file_path, uploaded_at, file_hash)
      `)
      .eq('aleo_address', aleoAddress)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist
      return NextResponse.json({
        success: true,
        profile: null,
      });
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        aleoAddress: profile.aleo_address,
        name: profile.name,
        skills: profile.skills || [],
        experienceYears: profile.experience_years,
        educationLevel: profile.education_level,
        profileScore: profile.profile_score,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        cv: profile.cv ? {
          id: profile.cv.id,
          filePath: profile.cv.file_path,
          uploadedAt: profile.cv.uploaded_at,
          fileHash: profile.cv.file_hash,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', message: error.message },
      { status: 500 }
    );
  }
}

// POST/PUT: Update profile
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { aleoAddress, name, skills, experienceYears, educationLevel } = body;

    if (!aleoAddress) {
      return NextResponse.json(
        { error: 'aleoAddress is required' },
        { status: 400 }
      );
    }

    // Upsert profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        aleo_address: aleoAddress,
        name: name || null,
        skills: skills || [],
        experience_years: experienceYears || 0,
        education_level: educationLevel || null,
      }, {
        onConflict: 'aleo_address',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500 }
      );
    }

    // Recalculate reputation
    await fetch(`${request.nextUrl.origin}/api/reputation/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aleoAddress }),
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        aleoAddress: profile.aleo_address,
        name: profile.name,
        skills: profile.skills || [],
        experienceYears: profile.experience_years,
        educationLevel: profile.education_level,
        profileScore: profile.profile_score,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', message: error.message },
      { status: 500 }
    );
  }
}








