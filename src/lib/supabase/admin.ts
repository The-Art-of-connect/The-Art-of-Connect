import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverSecret } from "@/lib/env";

/**
 * Service-role client. Bypasses row-level security, so it is used only in
 * trusted server code (payment webhooks) and never for counseling records.
 */
export function createAdminClient() {
  const key = serverSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.supabaseUrl || !key) return null;
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
