// Supabase client for browser-side calls.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables are missing. Check your .env/.env.local files.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'aleojob-main-auth-token',
  },
});

const clientCache = new Map<string, any>();

// Creates a wallet-scoped client used by RLS policies.
export function createSupabaseClientWithToken(aleoAddress: string) {
  const normalizedAddress = String(aleoAddress || '').trim().toLowerCase();
  const cacheKey = normalizedAddress || aleoAddress;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `aleojob-rls-${cacheKey}`,
    },
    global: {
      // Header fallback allows RLS to resolve wallet context without relying on connection-local set_config.
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
    .then(({ error }) => {
      if (error) {
        console.warn('[Supabase] set_app_config failed (header fallback will be used when policies support it):', error);
      }
    });

  clientCache.set(cacheKey, client);
  return client;
}

export type { SupabaseClient } from '@supabase/supabase-js';
