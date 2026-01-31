// Test endpoint to create test data in database
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

    const body = await request.json();
    const { createUser, createJob, createApplication } = body;

    const results: any = {};

    // Create test user
    if (createUser) {
      const testAddress = `test_${Date.now()}@aleo.test`;
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          aleo_address: testAddress,
          role: 'seeker',
          reputation_score: 50,
        })
        .select()
        .single();

      if (userError) {
        results.user = { error: userError.message, code: userError.code };
      } else {
        results.user = { success: true, data: user };
      }
    }

    // Create test job (requires a giver user first)
    if (createJob) {
      // First create a giver user
      const giverAddress = `giver_${Date.now()}@aleo.test`;
      const { data: giver, error: giverError } = await supabaseAdmin
        .from('users')
        .insert({
          aleo_address: giverAddress,
          role: 'giver',
          reputation_score: 0,
        })
        .select()
        .single();

      if (!giverError && giver) {
        // Create job
        const { data: job, error: jobError } = await supabaseAdmin
          .from('jobs')
          .insert({
            giver_id: giver.id,
            title: 'Test Job - Full Stack Developer',
            description: 'This is a test job listing for testing purposes.',
            skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
            budget: '500-800 ALEO',
            is_active: true,
            zk_membership_hash: Array.from({ length: 64 }, () => 
              Math.floor(Math.random() * 16).toString(16)
            ).join(''),
          })
          .select()
          .single();

        if (jobError) {
          results.job = { error: jobError.message, code: jobError.code };
        } else {
          results.job = { success: true, data: job };
          results.giver = { success: true, data: giver };
        }
      } else {
        results.job = { error: 'Failed to create giver user', details: giverError };
      }
    }

    // Create test application (requires user and job)
    if (createApplication && results.user?.data && results.job?.data) {
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: results.job.data.id,
          seeker_id: results.user.data.id,
          zk_application_hash: Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join(''),
          status: 'pending',
        })
        .select()
        .single();

      if (appError) {
        results.application = { error: appError.message, code: appError.code };
      } else {
        results.application = { success: true, data: application };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test data created',
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}






