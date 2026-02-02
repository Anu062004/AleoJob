// API Route: Calculate and update reputation score
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { aleoAddress } = await request.json();

    if (!aleoAddress) {
      return NextResponse.json(
        { error: 'aleoAddress is required' },
        { status: 400 }
      );
    }

    // Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('aleo_address', aleoAddress)
      .single();

    if (profileError) {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          aleo_address: aleoAddress,
          profile_score: 0,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create profile', details: createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        profileScore: 0,
        breakdown: {
          education: 0,
          skills: 0,
          experience: 0,
          projects: 0,
          cvUploaded: 0,
        },
      });
    }

    // Check if CV exists
    const { data: cv } = await supabaseAdmin
      .from('cvs')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    // Calculate score using database function
    const { data: scoreResult, error: scoreError } = await supabaseAdmin
      .rpc('calculate_profile_score', {
        p_education_level: profile.education_level || null,
        p_skills_count: profile.skills?.length || 0,
        p_experience_years: profile.experience_years || 0,
        p_has_projects: false, // TODO: Add projects table later
        p_cv_uploaded: !!cv,
      });

    if (scoreError) {
      console.error('Error calculating score:', scoreError);
      // Fallback to manual calculation
      let score = 0;
      if (profile.education_level) score += 20;
      if ((profile.skills?.length || 0) >= 5) score += 20;
      if ((profile.experience_years || 0) >= 2) score += 30;
      if (cv) score += 10;
      score = Math.min(score, 100);

      // Update profile
      await supabaseAdmin
        .from('profiles')
        .update({ profile_score: score })
        .eq('id', profile.id);

      return NextResponse.json({
        success: true,
        profileScore: score,
        breakdown: {
          education: profile.education_level ? 20 : 0,
          skills: (profile.skills?.length || 0) >= 5 ? 20 : 0,
          experience: (profile.experience_years || 0) >= 2 ? 30 : 0,
          projects: 0,
          cvUploaded: cv ? 10 : 0,
        },
      });
    }

    const calculatedScore = scoreResult || 0;

    // Update profile score
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ profile_score: calculatedScore })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile score:', updateError);
    }

    // Also update users table reputation_score
    await supabaseAdmin
      .from('users')
      .update({ reputation_score: calculatedScore })
      .eq('aleo_address', aleoAddress);

    return NextResponse.json({
      success: true,
      profileScore: calculatedScore,
      breakdown: {
        education: profile.education_level ? 20 : 0,
        skills: (profile.skills?.length || 0) >= 5 ? 20 : 0,
        experience: (profile.experience_years || 0) >= 2 ? 30 : 0,
        projects: 0,
        cvUploaded: cv ? 10 : 0,
      },
    });
  } catch (error: any) {
    console.error('Reputation calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate reputation', message: error.message },
      { status: 500 }
    );
  }
}







