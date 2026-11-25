import "server-only";
import { clientMeta, logSecurityEvent } from "@/lib/security";
import { allowedHostnames, siteverify, type TurnstileAction, type TurnstileResult } from "@/lib/turnstile-core";

/**
 * Cloudflare Turnstile bot protection, verified on the server for every
 * public form (see turnstile-core for the rules).
 *
 * Mandatory: once the site key is live, a request without a valid token is
 * refused — including when the secret key is missing or Cloudflare can't be
 * reached (fail closed). Only a build with no Turnstile keys at all (local
 * development) skips the check.
 */
const siteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const secretKey = () => process.env.TURNSTILE_SECRET_KEY ?? "";

export const isTurnstileConfigured = () => Boolean(secretKey() && siteKey());
export const turnstileStatus = () =>
  isTurnstileConfigured() ? "active" : siteKey() || secretKey() ? "misconfigured" : "not_configured";

export async function verifyTurnstile(form: FormData, action: TurnstileAction, email?: string | null): Promise<TurnstileResult & { skipped?: boolean }> {
  if (!siteKey() && !secretKey()) return { ok: true, skipped: true };
  const { ip } = await clientMeta();
  const result = await siteverify({
    secret: secretKey(),
    token: form.get("cf-turnstile-response"),
    remoteip: ip,
    expectedAction: action,
    allowedHostnames: allowedHostnames(process.env.TURNSTILE_ALLOWED_HOSTNAMES, process.env.NEXT_PUBLIC_SITE_URL),
  });
  if (!result.ok) {
    // Logged without the token itself.
    await logSecurityEvent("bot_check_failed", {
      email: email ?? null,
      details: { form: action, reason: result.reason, ...(result.codes?.length ? { codes: result.codes.join(",") } : {}), ...(result.hostname ? { hostname: result.hostname } : {}) },
    });
  }
  return result;
}

export const BOT_CHECK_MESSAGE = "Please complete the security check and try again.";
