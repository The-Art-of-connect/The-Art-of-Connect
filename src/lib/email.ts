import "server-only";
import { serverConfig, serverSecret } from "@/lib/env";

/**
 * Transactional email through Resend (https://resend.com). Inactive until
 * RESEND_API_KEY and EMAIL_FROM are set. Account emails (sign-up
 * confirmation, password reset) are sent by Supabase Auth through Resend's
 * SMTP settings; this module sends the platform's own messages.
 */
export const isEmailConfigured = () => Boolean(serverSecret("RESEND_API_KEY") && serverConfig.emailFrom);

type Email = { to: string; subject: string; heading: string; paragraphs: string[]; action?: { label: string; url: string }; tag?: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, accessible HTML with a plain-text alternative. */
export function renderEmail({ heading, paragraphs, action }: Pick<Email, "heading" | "paragraphs" | "action">) {
  const html = `<!doctype html><html><body style="margin:0;background:#F8F3E9;font-family:Helvetica,Arial,sans-serif;color:#211C18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCF6;border:1px solid #E8D9C5;border-radius:16px">
<tr><td style="background:#211C18;border-radius:16px 16px 0 0;padding:24px 32px;color:#C5A572;font-family:Georgia,serif;font-size:20px">The Art <i>of</i> Connect</td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 16px">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;color:#4A4038;margin:0 0 16px">${esc(p)}</p>`).join("")}
${action ? `<p style="margin:28px 0"><a href="${esc(action.url)}" style="background:#C5A572;color:#211C18;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;display:inline-block">${esc(action.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #E8D9C5;font-size:12px;color:#615548">In Business. In Life. In Love. · The Art of Connect, LLC · info@theartofconnect.com</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", ...paragraphs, ...(action ? ["", `${action.label}: ${action.url}`] : []), "", "The Art of Connect, LLC"].join("\n");
  return { html, text };
}

export async function sendEmail(email: Email): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isEmailConfigured()) return { ok: false, error: "Email is not configured yet (RESEND_API_KEY / EMAIL_FROM)." };
  const { html, text } = renderEmail(email);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${serverSecret("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: serverConfig.emailFrom,
        to: [email.to],
        reply_to: serverConfig.emailReplyTo,
        subject: email.subject,
        html,
        text,
        tags: email.tag ? [{ name: "category", value: email.tag }] : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message ?? `Resend returned ${res.status}` };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }
}
