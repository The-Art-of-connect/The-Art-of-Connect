import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** A one-way hash of the visitor's IP (the IP itself is never stored). */
async function visitorKey() {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`aoc:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Returns true if the action may proceed. Limits are per visitor and per
 * action, enforced in the database so they hold across server instances.
 * Fails open only when the database is not connected (pre-launch preview).
 */
export async function allow(action: string, max: number, windowSeconds: number) {
  const supabase = await createClient();
  if (!supabase) return true;
  const { data, error } = await supabase.rpc("rate_limit_hit", { bucket: `${action}:${await visitorKey()}`, max_hits: max, window_seconds: windowSeconds });
  return error ? false : data === true;
}
