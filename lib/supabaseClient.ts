// Supabase Client for Frontend (Browser)
// This creates a client-side Supabase client that can be used in React components

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

// Helper function to create a Supabase client with custom JWT token
// This is used when you need to set the aleo_address for RLS policies
export function createSupabaseClientWithToken(aleoAddress: string) {
  // Import JWT creation function
  // Note: In a real app, you'd get the JWT from your backend API
  // For now, we'll use the anon key client and set config via RPC

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {},
    },
  });

  // Set the aleo_address config for RLS policies
  // This requires the set_config function we created in migration 003
  client
    .rpc('set_app_config', {
      setting_name: 'app.aleo_address',
      setting_value: aleoAddress
    })
    .then(({ error }: { error: Error | null }) => {
      if (error) console.warn('Failed to set config for RLS:', error);
    });

  return client;
}

// Type exports for TypeScript
export type { SupabaseClient } from '@supabase/supabase-js';


