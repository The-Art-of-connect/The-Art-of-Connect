import "server-only";
import { clientMeta } from "@/lib/security";

/**
 * Cloudflare Turnstile bot protection, verified server-side on every
 * protected form. Free, privacy-friendly, and needs no DNS or nameserver
 * changes. Until the keys are added it is skipped (reported as "not
 * configured" in the Security Center) so the site keeps working.
 */
export const isTurnstileConfigured = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function verifyTurnstile(form: FormData): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!isTurnstileConfigured()) return { ok: true, skipped: true };
  const token = String(form.get("cf-turnstile-response") ?? "");
  if (!token || token.length > 2048) return { ok: false };
  try {
    const { ip } = await clientMeta();
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true };
  } catch {
    // Fail closed when configured: an unverifiable request is treated as a bot.
    return { ok: false };
  }
}
