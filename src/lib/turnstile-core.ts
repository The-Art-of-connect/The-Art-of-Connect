/**
 * Cloudflare Turnstile server-side validation (framework-free so it can be
 * unit-tested). Every protected form sends the token the widget produced;
 * the server confirms it with Cloudflare's Siteverify API before doing
 * anything else. Tokens are single-use and expire after 5 minutes, so an
 * expired or replayed token is refused by Cloudflare ("timeout-or-duplicate").
 *
 * Beyond Cloudflare's own success flag we also require that the token was
 * issued for THIS form (action) on one of OUR hostnames, so a token solved on
 * another page or another site can't be reused here.
 */

export const TURNSTILE_ACTIONS = ["sign_in", "sign_up", "password_reset", "waitlist", "pro_interest", "pro_application"] as const;
export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[number];

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const DEFAULT_HOSTNAMES = ["theartofconnect.com", "www.theartofconnect.com", "theartofconnect.netlify.app"];
export const MAX_TOKEN_LENGTH = 2048;

export type TurnstileFailure =
  | "missing" // no token submitted
  | "malformed" // token too long / not a string
  | "invalid" // Cloudflare: invalid-input-response
  | "expired_or_reused" // Cloudflare: timeout-or-duplicate
  | "rejected" // Cloudflare said no for another reason
  | "action_mismatch" // token solved for a different form
  | "hostname_mismatch" // token solved on a site that isn't ours
  | "unavailable" // Cloudflare unreachable / bad response → fail closed
  | "not_configured"; // secret missing while the widget is live → fail closed

export type TurnstileResult = { ok: true; hostname?: string } | { ok: false; reason: TurnstileFailure; codes?: string[]; hostname?: string };

type SiteverifyResponse = { success?: boolean; "error-codes"?: string[]; action?: string; hostname?: string; challenge_ts?: string };

export async function siteverify(opts: {
  secret: string;
  token: unknown;
  remoteip?: string | null;
  expectedAction?: string;
  /** Hostnames a token may come from; omit to skip the check (only for Cloudflare's test keys). */
  allowedHostnames?: string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<TurnstileResult> {
  const { secret, token, remoteip, expectedAction, allowedHostnames, fetchImpl = fetch, timeoutMs = 8000 } = opts;
  if (!secret) return { ok: false, reason: "not_configured" };
  if (token == null || token === "") return { ok: false, reason: "missing" };
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "malformed" };

  let data: SiteverifyResponse;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const res = await fetchImpl(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const codes = Array.isArray(data["error-codes"]) ? data["error-codes"].map(String) : [];
  if (data.success !== true) {
    const reason: TurnstileFailure = codes.includes("timeout-or-duplicate")
      ? "expired_or_reused"
      : codes.includes("invalid-input-response")
        ? "invalid"
        : "rejected";
    return { ok: false, reason, codes, hostname: data.hostname };
  }
  if (expectedAction && data.action !== expectedAction) return { ok: false, reason: "action_mismatch", hostname: data.hostname };
  if (allowedHostnames && !allowedHostnames.includes(String(data.hostname ?? "").toLowerCase())) {
    return { ok: false, reason: "hostname_mismatch", hostname: data.hostname };
  }
  return { ok: true, hostname: data.hostname };
}

/** Our hostnames, plus any listed in TURNSTILE_ALLOWED_HOSTNAMES (comma separated). */
export function allowedHostnames(extra = "", siteUrl = "") {
  const set = new Set(DEFAULT_HOSTNAMES);
  for (const h of extra.split(",")) if (h.trim()) set.add(h.trim().toLowerCase());
  try {
    if (siteUrl) set.add(new URL(siteUrl).hostname.toLowerCase());
  } catch {
    /* ignore */
  }
  return [...set];
}
