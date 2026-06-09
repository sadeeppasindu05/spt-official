import { createClient } from '@supabase/supabase-js';

function getSupabaseCredentials() {
  const win = typeof window !== 'undefined' ? window : undefined;
  const url = (win as any)?.__SUPABASE_URL__ || import.meta.env.VITE_SUPABASE_URL || '';
  const key = (win as any)?.__SUPABASE_ANON_KEY__ || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
}

const creds = getSupabaseCredentials();
const finalUrl = creds.url || 'https://placeholder.supabase.co';
const finalKey = creds.key || 'placeholder';

if (!creds.url || !creds.key) {
  console.warn("Supabase credentials missing. Running in local fallback mode.");
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Admin client with service_role key for privileged operations (delete users from Auth, etc.)
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin = serviceRoleKey
  ? createClient(finalUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
