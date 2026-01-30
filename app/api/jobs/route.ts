// API Route: Get all active jobs
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch active jobs with giver information
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        description,
        skills,
        budget,
        is_active,
        created_at,
        updated_at,
        giver:users!jobs_giver_id_fkey (
          id,
          reputation_score
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    // Format the response
    const formattedJobs = jobs?.map((job: any) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      skills: job.skills || [],
      budget: job.budget,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      giverReputation: job.giver?.reputation_score || 0,
    })) || [];

    return NextResponse.json({
      success: true,
      jobs: formattedJobs,
      total: formattedJobs.length,
    });
  } catch (error: any) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', message: error.message },
      { status: 500 }
    );
  }
}


