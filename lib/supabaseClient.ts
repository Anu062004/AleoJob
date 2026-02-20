// Supabase client shared by legacy app routes.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables are missing. Check your .env/.env.local files.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function createSupabaseClientWithToken(aleoAddress: string) {
  const normalizedAddress = String(aleoAddress || '').trim().toLowerCase();

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-aleo-address': normalizedAddress,
      },
    },
  });

  client
    .rpc('set_app_config', {
      setting_name: 'app.aleo_address',
      setting_value: normalizedAddress,
    })
    .then(({ error }: { error: Error | null }) => {
      if (error) console.warn('[Supabase] Failed to set config for RLS:', error);
    });

  return client;
}

export type { SupabaseClient } from '@supabase/supabase-js';
