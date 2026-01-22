// API Route: Get Applications for a Job
// GET /api/jobs/[id]/applications

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const aleoAddress = request.headers.get('x-aleo-address');

    if (!aleoAddress) {
      return NextResponse.json(
        { error: 'Missing Aleo address in headers' },
        { status: 401 }
      );
    }

    // Verify user exists and is a giver
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'giver') {
      return NextResponse.json(
        { error: 'Only job givers can view applications' },
        { status: 403 }
      );
    }

    // Verify job exists and belongs to this giver
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, giver_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.giver_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only view applications for your own jobs' },
        { status: 403 }
      );
    }

    // Get applications for this job
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        status,
        encrypted_resume_url,
        encrypted_cover_letter,
        created_at,
        seeker:users!applications_seeker_id_fkey (
          id,
          reputation_score
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: applicationsError.message },
        { status: 500 }
      );
    }

    // Return applications without sensitive data
    const sanitizedApplications = applications?.map((app: any) => ({
      id: app.id,
      status: app.status,
      resumeUrl: app.encrypted_resume_url,
      coverLetterUrl: app.encrypted_cover_letter,
      seekerReputation: app.seeker?.reputation_score || 0,
      createdAt: app.created_at,
    }));

    return NextResponse.json({
      success: true,
      applications: sanitizedApplications || [],
    });
  } catch (error: any) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications', message: error.message },
      { status: 500 }
    );
  }
}

