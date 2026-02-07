import { createClient } from "@supabase/supabase-js";

// Service role client — only use in API routes, webhooks, and cron jobs.
// NEVER expose this in the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
