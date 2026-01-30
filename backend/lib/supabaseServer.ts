// Supabase Server Client

import { createClient } from '@supabase/supabase-js';
import { createJWT } from './jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Admin client (server-only). Null if not configured.
export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

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


