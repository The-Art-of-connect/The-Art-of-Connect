import "server-only";
import { isTestAccountEmail } from "@/lib/test-accounts";
import { env, serverConfig, serverSecret } from "@/lib/env";
import { renderEmail, type EmailContent } from "@/lib/email-templates";

/**
 * Transactional email through Resend (https://resend.com).
 *
 * Safeguards:
 *  • Inactive until RESEND_API_KEY and EMAIL_FROM are set.
 *  • While the launch lock is on, mail is delivered ONLY to authorized test
 *    recipients (@theartofconnect.com addresses and EMAIL_TEST_RECIPIENTS).
 *  • Marketing email is refused unless the owner enables it at launch.
 *  • Templates take only whitelisted, non-sensitive fields (see email-templates).
 * Account emails (confirmation, password reset) are sent by Supabase Auth
 * through Resend's SMTP service using the same branded design.
 */
export const isEmailConfigured = () => Boolean(serverSecret("RESEND_API_KEY") && serverConfig.emailFrom);

export function isAuthorizedTestRecipient(email: string) {
  const e = email.trim().toLowerCase();
  const extra = (process.env.EMAIL_TEST_RECIPIENTS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return e.endsWith("@theartofconnect.com") || extra.includes(e);
}

export type SendResult = { ok: boolean; id?: string; skipped?: string; error?: string };

export async function sendEmail(to: string, content: EmailContent, opts: { category: "account" | "membership" | "billing" | "professional" | "owner_alert" | "marketing"; marketingEnabled?: boolean; idempotencyKey?: string } = { category: "account" }): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, skipped: "Email is not configured yet (RESEND_API_KEY / EMAIL_FROM)." };
  if (opts.category === "marketing" && !opts.marketingEnabled) return { ok: false, skipped: "Marketing email is disabled until launch." };
  if (env.launchLocked && !isAuthorizedTestRecipient(to) && !(await isTestAccountEmail(to))) return { ok: false, skipped: "Pre-launch: only authorized test recipients and owner test accounts receive email." };

  const { html, text } = renderEmail(content);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverSecret("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        // Stripe can deliver a webhook more than once; Resend drops repeats with the same key.
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: serverConfig.emailFrom,
        to: [to],
        reply_to: serverConfig.emailReplyTo,
        subject: content.subject,
        html,
        text,
        tags: [{ name: "category", value: opts.category }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message ?? `Resend returned ${res.status}` };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }
}

/** Owner alerts go to OWNER_ALERT_EMAIL (default info@theartofconnect.com). */
export const ownerAlertAddress = () => process.env.OWNER_ALERT_EMAIL || "info@theartofconnect.com";
