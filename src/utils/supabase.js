import { createClient } from '@supabase/supabase-js';

// Anon key only — RLS enforces all access control server-side.
// Never import SUPABASE_SERVICE_KEY here.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default supabase;
