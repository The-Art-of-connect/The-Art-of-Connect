import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type SecurityEvent =
  | "login_succeeded" | "login_failed" | "mfa_failed" | "password_reset_requested" | "password_changed"
  | "signup_attempt" | "signup_blocked" | "bot_check_failed" | "rate_limited";

/** One-way hash of the visitor's IP and a trimmed user agent. Raw IPs are never stored. */
export async function clientMeta() {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(`aoc-ip:${ip}`).digest("hex").slice(0, 32) : null;
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300) || null;
  return { ip, ipHash, userAgent };
}

const SECRETISH = /(password|secret|token|api_?key|authorization|cookie|card|cvc|journal|reflection|assessment|note|message|date_?of_?birth|dob)/i;

/** Removes anything that could be sensitive before it is written to a log. */
export function sanitizeDetails(details: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (SECRETISH.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

/** Records a security event using the server key. Never throws. */
export async function logSecurityEvent(type: SecurityEvent, opts: { email?: string | null; userId?: string | null; details?: Record<string, unknown> } = {}) {
  try {
    const db = createAdminClient();
    if (!db) return;
    const { ipHash, userAgent } = await clientMeta();
    await db.from("security_events").insert({
      event_type: type,
      email: opts.email?.trim().toLowerCase().slice(0, 254) ?? null,
      user_id: opts.userId ?? null,
      ip_hash: ipHash,
      user_agent: userAgent,
      details: sanitizeDetails(opts.details),
    });
  } catch {
    /* logging must never break sign-in */
  }
}

/** Throwaway-email providers commonly used for fake profiles. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
  "mailnesia.com", "mintemail.com", "mohmal.com", "emailondeck.com", "tempinbox.com", "spamgourmet.com", "burnermail.io",
]);
export const isDisposableEmail = (email: string) => DISPOSABLE.has(email.split("@")[1]?.toLowerCase() ?? "");
