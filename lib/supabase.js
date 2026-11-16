// One shared connection to your Supabase project.
// Every screen imports `supabase` from here to read and save data.
import { createClient } from "@supabase/supabase-js";

// These two values are public by design: they only say WHICH project to talk to.
// What protects the data is the login plus your RLS policies.
// If a .env.local file sets them, that wins; otherwise the values below are used.
// NEVER put the secret key (sb_secret_...) in this app: it skips RLS completely.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ndrsjegcrqhnhnpmrfyp.supabase.co";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dEMboe2w3MseIIxIjmP0aA_XVc-vMxE";

export const supabase = createClient(url, publishableKey);
