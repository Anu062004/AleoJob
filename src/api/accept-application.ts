// Accept Application API Route Handler
// Standalone Express handler that creates escrow when application is accepted

import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

// Get the root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

// Environment variables for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client for server-side operations
const supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

// Import aleo-service and config dynamically to avoid path issues
let aleoService: any = null;
let ALEO_CONFIG: any = null;

async function loadDependencies() {
    if (!aleoService) {
        try {
            // Use pathToFileURL for Windows ESM compatibility
            const aleoServicePath = pathToFileURL(join(rootDir, 'lib', 'aleo-service.ts')).href;
            const aleoServiceModule = await import(aleoServicePath);
            aleoService = aleoServiceModule.aleoService;

            // Add debug info about RPC endpoints
            if (ALEO_CONFIG && ALEO_CONFIG.rpcEndpoints) {
                console.log('[API] Active Aleo RPC Endpoints:', ALEO_CONFIG.rpcEndpoints);

                // Test the first endpoint manually
                try {
                    const testRes = await fetch(`${ALEO_CONFIG.rpcEndpoints[0]}/latest/height`);
                    if (testRes.ok) {
                        const height = await testRes.text();
                        console.log(`✅ [API] RPC Endpoint ${ALEO_CONFIG.rpcEndpoints[0]} is REACHABLE (Height: ${height})`);
                    } else {
                        console.warn(`⚠️ [API] RPC Endpoint ${ALEO_CONFIG.rpcEndpoints[0]} returned status ${testRes.status}`);
                    }
                } catch (fetchErr: any) {
                    console.error(`❌ [API] RPC Endpoint ${ALEO_CONFIG.rpcEndpoints[0]} is UNREACHABLE:`, fetchErr.message);
                }
            }

            console.log('[API] aleo-service loaded successfully');
        } catch (e: any) {
            console.error('[API] Failed to load aleo-service:', e.message);
        }
    }
    if (!ALEO_CONFIG) {
        try {
            const configPath = pathToFileURL(join(rootDir, 'lib', 'aleo-config.ts')).href;
            const configModule = await import(configPath);
            ALEO_CONFIG = configModule.ALEO_CONFIG;
            console.log('[API] aleo-config loaded successfully');
        } catch (e: any) {
            console.error('[API] Failed to load aleo-config:', e.message);
        }
    }
}

// Production-safe error handler wrapper
async function safeHandler(handler: () => Promise<{ status: number; json: any }>): Promise<{ status: number; json: any }> {
    try {
        return await handler();
    } catch (error: any) {
        console.error('[API] UNHANDLED EXCEPTION:', {
            message: error?.message,
            stack: error?.stack,
        });
        return {
            status: 500,
            json: {
                success: false,
                message: error?.message || 'Internal server error',
            },
        };
    }
}

export async function handleAcceptApplication(req: Request, res: Response) {
    // Load dependencies on first call
    await loadDependencies();

    const result = await safeHandler(async () => {
        console.log('[API] ========================================');
        console.log('[API] Accept application request received');
        console.log('[API] ========================================');

        // Check if modules are available
        if (!supabaseAdmin) {
            console.error('[API] supabaseAdmin is null - check environment variables');
            return {
                status: 500,
                json: {
                    success: false,
                    message: 'Server configuration error: Database not configured. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
                }
            };
        }

        if (!aleoService) {
            console.error('[API] aleoService is null');
            return {
                status: 500,
                json: {
                    success: false,
                    message: 'Server configuration error: Aleo service not initialized'
                }
            };
        }

        // Parse request body
        const { applicationId, employerPrivateKey, aleoAddress, amount } = req.body;

        console.log('[API] Request body:', {
            applicationId,
            aleoAddress: aleoAddress?.substring(0, 20) + '...',
            amount,
            hasPrivateKey: !!employerPrivateKey,
        });

        // Validation
        if (!applicationId || !employerPrivateKey || !aleoAddress) {
            return {
                status: 400,
                json: {
                    success: false,
                    message: 'Missing required fields: applicationId, employerPrivateKey, aleoAddress'
                }
            };
        }

        // Verify user exists
        const { data: user, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('id, aleo_address')
            .eq('aleo_address', aleoAddress)
            .single();

        if (userError || !user) {
            console.error('[API] User not found:', userError);
            return { status: 404, json: { success: false, message: 'User not found' } };
        }

        // Fetch application with job details
        const { data: application, error: applicationError } = await supabaseAdmin
            .from('applications')
            .select(`
        id, job_id, seeker_id, status,
        jobs!inner (id, giver_id, title, budget, payment_status)
      `)
            .eq('id', applicationId)
            .single();

        if (applicationError || !application) {
            console.error('[API] Application not found:', applicationError);
            return { status: 404, json: { success: false, message: 'Application not found' } };
        }

        const job = (application as any).jobs;

        // Validate job ownership
        if (job.giver_id !== user.id) {
            return { status: 403, json: { success: false, message: 'You do not own this job' } };
        }

        // Prevent double acceptance
        if (application.status === 'accepted') {
            return { status: 400, json: { success: false, message: 'Application has already been accepted' } };
        }

        // Prevent accepting if escrow already exists
        if (job.payment_status === 'locked' || job.payment_status === 'completed') {
            return { status: 400, json: { success: false, message: 'Job already has an active escrow' } };
        }

        // Get freelancer details
        const { data: freelancer, error: freelancerError } = await supabaseAdmin
            .from('profiles')
            .select('id, aleo_address')
            .eq('id', application.seeker_id)
            .single();

        if (freelancerError || !freelancer) {
            return { status: 404, json: { success: false, message: 'Freelancer not found' } };
        }

        if (!freelancer.aleo_address) {
            return { status: 400, json: { success: false, message: 'Freelancer does not have an Aleo address' } };
        }

        // Parse amount
        let escrowAmount = amount;
        if (!escrowAmount && job.budget) {
            const numbers = job.budget.toString().match(/\d+/g);
            if (numbers && numbers.length > 0) {
                escrowAmount = parseFloat(numbers[0]);
            }
        }

        if (!escrowAmount || escrowAmount <= 0) {
            return { status: 400, json: { success: false, message: 'Invalid or missing payment amount' } };
        }

        // Update application status
        const { error: updateAppError } = await supabaseAdmin
            .from('applications')
            .update({ status: 'accepted' })
            .eq('id', applicationId);

        if (updateAppError) {
            return { status: 500, json: { success: false, message: 'Failed to update application status' } };
        }

        // Create escrow
        console.log('[API] Creating escrow...');
        console.log('[API] Job ID:', job.id);
        console.log('[API] Amount:', escrowAmount);

        const escrowResult = await aleoService.createEscrow(
            job.id,
            employerPrivateKey,
            freelancer.aleo_address,
            escrowAmount
        );

        console.log('[API] Escrow result:', escrowResult);

        if (!escrowResult.success) {
            // Rollback
            await supabaseAdmin.from('applications').update({ status: 'pending' }).eq('id', applicationId);
            return { status: 500, json: { success: false, message: escrowResult.error || 'Failed to create escrow' } };
        }

        // Store escrow in database
        const { data: escrow, error: escrowError } = await supabaseAdmin
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
            await supabaseAdmin.from('applications').update({ status: 'pending' }).eq('id', applicationId);
            return { status: 500, json: { success: false, message: `Failed to store escrow: ${escrowError.message}` } };
        }

        // Update job payment status
        await supabaseAdmin.from('jobs').update({ payment_status: 'locked' }).eq('id', job.id);

        console.log('[API] SUCCESS: Application accepted and escrow created');

        return {
            status: 200,
            json: {
                success: true,
                message: 'Application accepted and escrow created',
                data: {
                    application: { id: application.id, status: 'accepted' },
                    escrow: { id: escrow.id, transactionId: escrowResult.transactionId, amount: escrowAmount },
                },
            }
        };
    });

    res.status(result.status).json(result.json);
}

export async function handleGetAccept(req: Request, res: Response) {
    res.json({
        status: 'ok',
        message: 'Accept application endpoint is available',
        method: 'POST',
    });
}
