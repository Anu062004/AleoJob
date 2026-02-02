// Supabase Client for Frontend (Browser)
// This creates a client-side Supabase client that can be used in React components

import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite environment variables
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables are not set. Please check your .env.local file.');
}

// Create a single Supabase client instance for the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// Cache for client instances to avoid "Multiple GoTrueClient instances" warning
const clientCache = new Map<string, any>();

// Helper function to create a Supabase client with custom JWT token
// This is used when you need to set the aleo_address for RLS policies
export function createSupabaseClientWithToken(aleoAddress: string) {
    if (clientCache.has(aleoAddress)) {
        return clientCache.get(aleoAddress);
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    // Set the aleo_address config for RLS policies
    // This requires the set_app_config function in your database
    client
        .rpc('set_app_config', {
            setting_name: 'app.aleo_address',
            setting_value: aleoAddress
        })
        .then(({ error }) => {
            if (error) {
                console.warn('⚠️ [Supabase] Failed to set config for RLS. This is expected if you haven\'t run the SQL script yet.', error);
                console.info('👉 To fix this, please run the SQL script provided in "supabase/fix_supabase_rpc.sql" in your Supabase SQL Editor.');
            } else {
                console.log('Successfully set RLS config for:', aleoAddress);
            }
        });

    clientCache.set(aleoAddress, client);
    return client;
}

// Type exports for TypeScript
export type { SupabaseClient } from '@supabase/supabase-js';
