import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
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
  return NextResponse.json({ status: database === "connected" ? "ok" : "degraded", database, schema }, { headers: { "Cache-Control": "no-store" } });
}
