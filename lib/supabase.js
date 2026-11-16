// One shared connection to your Supabase project.
// Every screen imports `supabase` from here to read and save data.
import { createClient } from "@supabase/supabase-js";

// These two values are public by design: they only say WHICH project to talk to.
// What protects the data is the login plus your RLS policies.
// They come from environment variables (Netlify site settings in production,
// a .env.local file when running locally) and are never hardcoded in the repo.
// NEVER put the secret key (sb_secret_...) in this app: it skips RLS completely.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
      "(in .env.local locally, or in Netlify environment variables)."
  );
}

export const supabase = createClient(url, publishableKey);
