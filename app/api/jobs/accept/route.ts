// API Route: Accept Job Application
// POST /api/jobs/accept
// Automatically creates escrow when application is accepted
// PRODUCTION-SAFE: Always returns JSON, never crashes

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { aleoService } from '@/lib/aleo-service';
import { ALEO_CONFIG } from '@/lib/aleo-config';

// Production-safe error handler wrapper
// Ensures we ALWAYS return JSON, even for unhandled exceptions
async function safeHandler(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: any) {
    // Final safety net - catch ANY unhandled exception
    console.error('[API] UNHANDLED EXCEPTION in safeHandler:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    
    return NextResponse.json(
      {
        success: false,
        message: error?.message || error?.toString() || 'Internal server error',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  return safeHandler(async () => {
    console.log('[API] ========================================');
    console.log('[API] Accept application request received');
    console.log('[API] ========================================');
    
    // Check if modules are available
    if (!supabaseAdmin) {
      console.error('[API] supabaseAdmin is null - check environment variables');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Server configuration error: Database not configured. Check SUPABASE_SERVICE_ROLE_KEY environment variable.' 
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!aleoService) {
      console.error('[API] aleoService is null');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Server configuration error: Aleo service not initialized' 
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Parse request body with error handling
    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request body. Expected JSON.' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { applicationId, employerPrivateKey, aleoAddress, amount } = body;

    console.log('[API] Request body:', {
      applicationId,
      aleoAddress: aleoAddress?.substring(0, 20) + '...',
      amount,
      hasPrivateKey: !!employerPrivateKey,
    });

    // Validation
    if (!applicationId || !employerPrivateKey || !aleoAddress) {
      console.error('[API] Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: applicationId, employerPrivateKey, aleoAddress' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user exists and is the employer - use profiles table
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      console.error('[API] User not found:', userError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'User not found' 
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch application with job details
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        job_id,
        seeker_id,
        status,
        jobs!inner (
          id,
          giver_id,
          title,
          budget,
          payment_status
        )
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError || !application) {
      console.error('[API] Application not found:', applicationError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Application not found' 
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const job = (application as any).jobs;

    // Validate job ownership
    if (job.giver_id !== user.id) {
      console.error('[API] Job ownership validation failed');
      return NextResponse.json(
        { 
          success: false, 
          message: 'You do not own this job' 
        },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Prevent double acceptance
    if (application.status === 'accepted') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Application has already been accepted' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Prevent accepting if escrow already exists
    if (job.payment_status === 'locked' || job.payment_status === 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Job already has an active escrow' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get freelancer details from profiles table
    const { data: freelancer, error: freelancerError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('id', application.seeker_id)
      .single();

    if (freelancerError || !freelancer) {
      console.error('[API] Freelancer not found:', freelancerError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Freelancer not found' 
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!freelancer.aleo_address) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Freelancer does not have an Aleo address' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse amount from budget or use provided amount
    let escrowAmount = amount;
    if (!escrowAmount && job.budget) {
      // Try to parse budget (could be "100-200" or "100" or "$100")
      const budgetStr = job.budget.toString();
      const numbers = budgetStr.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        escrowAmount = parseFloat(numbers[0]);
      }
    }

    if (!escrowAmount || escrowAmount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid or missing payment amount' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update application status to accepted
    const { error: updateAppError } = await supabaseAdmin
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId);

    if (updateAppError) {
      console.error('[API] Error updating application:', updateAppError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to update application status' 
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // ============================================
    // CRITICAL: Create escrow with blockchain confirmation
    // Database updates happen ONLY after successful blockchain transaction
    // ============================================
    
    console.log('[API] ========================================');
    console.log('[API] ESCROW CREATION - Pre-flight Check');
    console.log('[API] ========================================');
    console.log('[API] Job ID:', job.id);
    console.log('[API] Amount:', escrowAmount);
    console.log('[API] Employer Address:', aleoAddress?.substring(0, 20) + '...');
    console.log('[API] Freelancer Address:', freelancer.aleo_address?.substring(0, 20) + '...');
    console.log('[API] Program:', ALEO_CONFIG.programs.escrow);
    console.log('[API] Transition: create_escrow');
    console.log('[API] ========================================');

    // Call createEscrow - it NEVER throws, always returns EscrowResponse
    const escrowResult = await aleoService.createEscrow(
      job.id,
      employerPrivateKey,
      freelancer.aleo_address,
      escrowAmount
    );

    console.log('[API] ========================================');
    console.log('[API] ESCROW CREATION RESULT');
    console.log('[API] ========================================');
    console.log('[API] Success:', escrowResult.success);
    console.log('[API] Transaction ID:', escrowResult.transactionId);
    console.log('[API] Escrow ID:', escrowResult.escrowId);
    console.log('[API] Error:', escrowResult.error);
    console.log('[API] ========================================');

    // If escrow creation failed, rollback and return error
    if (!escrowResult.success) {
      console.error('[API] Escrow creation failed - rolling back application status');
      
      // Rollback application status
      try {
        await supabaseAdmin
          .from('applications')
          .update({ status: 'pending' })
          .eq('id', applicationId);
        console.log('[API] Application status rolled back to pending');
      } catch (rollbackError: any) {
        console.error('[API] Failed to rollback application status:', rollbackError);
        // Continue anyway - log the error
      }

      return NextResponse.json(
        { 
          success: false, 
          message: escrowResult.error || 'Failed to create escrow on blockchain',
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Escrow created successfully on blockchain - now update database
    console.log('[API] Escrow created on blockchain, updating database...');

    // Store escrow in database (only after successful blockchain transaction)
    let escrow;
    try {
      const { data: escrowData, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .insert({
          job_id: job.id,
          employer_id: user.id,
          freelancer_id: freelancer.id,
          amount: escrowAmount,
          status: 'locked',
          escrow_record_id: escrowResult.escrowId,
          create_tx: escrowResult.transactionId,
        })
        .select()
        .single();

      if (escrowError) {
        console.error('[API] Error creating escrow in database:', escrowError);
        // Rollback application status
        try {
          await supabaseAdmin
            .from('applications')
            .update({ status: 'pending' })
            .eq('id', applicationId);
        } catch (rollbackError: any) {
          console.error('[API] Failed to rollback application status:', rollbackError);
        }

        return NextResponse.json(
          { 
            success: false, 
            message: `Failed to store escrow record: ${escrowError.message || 'Unknown error'}`,
          },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }

      escrow = escrowData;
      console.log('[API] Escrow stored in database:', escrow.id);
    } catch (dbError: any) {
      console.error('[API] Database error while storing escrow:', dbError);
      // Rollback application status
      try {
        await supabaseAdmin
          .from('applications')
          .update({ status: 'pending' })
          .eq('id', applicationId);
      } catch (rollbackError: any) {
        console.error('[API] Failed to rollback application status:', rollbackError);
      }

      return NextResponse.json(
        { 
          success: false, 
          message: `Database error: ${dbError?.message || 'Unknown error'}`,
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Update job payment status
    try {
      const { error: jobUpdateError } = await supabaseAdmin
        .from('jobs')
        .update({ payment_status: 'locked' })
        .eq('id', job.id);

      if (jobUpdateError) {
        console.error('[API] Error updating job payment status:', jobUpdateError);
        // Don't fail the request, but log the error
        // Escrow is already created on blockchain and in database
      } else {
        console.log('[API] Job payment status updated to locked');
      }
    } catch (jobUpdateError: any) {
      console.error('[API] Exception updating job payment status:', jobUpdateError);
      // Don't fail - escrow is already created
    }

    console.log('[API] ========================================');
    console.log('[API] SUCCESS: Application accepted and escrow created');
    console.log('[API] ========================================');

    return NextResponse.json({
      success: true,
      message: 'Application accepted and escrow created',
      data: {
        application: {
          id: application.id,
          status: 'accepted',
        },
        escrow: {
          id: escrow.id,
          transactionId: escrowResult.transactionId,
          amount: escrowAmount,
        },
      },
    });
  });
}

// Export a GET handler for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Accept application endpoint is available',
    method: 'POST',
  });
}
