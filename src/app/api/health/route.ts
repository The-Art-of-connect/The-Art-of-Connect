import { NextResponse } from "next/server";
import { isSupabaseConfigured, serverSecret } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public, non-sensitive health check for uptime monitoring. */
export async function GET() {
  let database = isSupabaseConfigured() ? "error" : "not_configured";
  let schema: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase!.from("platform_settings").select("key").eq("key", "require_mfa_for_staff").maybeSingle();
    if (!error) {
      database = "connected";
      schema = data ? "current" : "outdated";
    }
  }
  // Which Stripe mode is configured (never the key itself).
  const key = serverSecret("STRIPE_SECRET_KEY");
  const stripe = !key ? "not_configured" : /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : "unrecognized";
  const pk = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  const stripe_publishable = !pk ? "not_configured" : pk.startsWith("pk_live_") ? "live" : pk.startsWith("pk_test_") ? "test" : "unrecognized";
  return NextResponse.json({ status: database === "connected" ? "ok" : "degraded", database, schema, stripe, stripe_publishable }, { headers: { "Cache-Control": "no-store" } });
}
