import { createClient } from '@supabase/supabase-js';

// Use Lovable's native Supabase integration (no VITE_* envs)
const w = window as any;
const supabaseUrl =
  w.LOVABLE_SUPABASE_URL ||
  w.__LOVABLE_SUPABASE_URL__ ||
  w.SUPABASE_URL ||
  w.__SUPABASE_URL__ ||
  (import.meta as any)?.env?.VITE_SUPABASE_URL;

const supabaseAnonKey =
  w.LOVABLE_SUPABASE_ANON_KEY ||
  w.__LOVABLE_SUPABASE_ANON_KEY__ ||
  w.SUPABASE_ANON_KEY ||
  w.__SUPABASE_ANON_KEY__ ||
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not hard-crash the app; surface a clear console error instead
  console.error(
    'Supabase is not configured. Please connect Supabase via the green button in Lovable.'
  );
}

let supabase: any;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Safe proxy: any usage will clearly explain configuration is missing
  supabase = new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Supabase is not configured. Connect Supabase in Lovable (green button) and reload.'
        );
      },
    }
  );
}

export { supabase };