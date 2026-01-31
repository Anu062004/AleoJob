// Supabase Server Client
// Fixed: Inlined implementation to avoid module resolution issues with Express

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Admin client (server-only). Null if not configured.
export const supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

// Simple JWT helper for RLS
function createJWT(aleoAddress: string): string {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        aleo_address: aleoAddress,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${secret}`).toString('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// User-scoped client (respects RLS).
export function createSupabaseClient(aleoAddress: string) {
    if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase not configured. Please set environment variables.');
    }

    const token = createJWT(aleoAddress);

    const client = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Best-effort: set session config for RLS policies that read current_setting('app.aleo_address')
    client
        .rpc('set_app_config', { setting_name: 'app.aleo_address', setting_value: aleoAddress })
        .then(({ error }) => {
            if (error) console.warn('Failed to set RLS config:', error);
        });

    return client;
}

