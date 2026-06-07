import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const finalUrl = supabaseUrl && supabaseUrl.trim() !== '' ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey && supabaseAnonKey.trim() !== '' ? supabaseAnonKey : 'placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials are missing. Running in local fallback mode.");
}

export const supabase = createClient(finalUrl, finalKey);
