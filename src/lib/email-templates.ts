/**
 * Branded email templates — The Art of Connect.
 * Espresso header with the official monogram, ivory card, champagne-gold
 * button, burgundy accent rule. Table-based layout for every email client.
 *
 * PRIVACY RULE: templates accept only the small set of non-sensitive fields
 * defined below. Journal entries, private reflections, assessments, session
 * notes, dates of birth and message contents can never be passed in —
 * assertSafeFields() rejects them by name, and content is HTML-escaped.
 */

export type EmailContent = { subject: string; preheader: string; heading: string; paragraphs: string[]; action?: { label: string; url: string } };

const FORBIDDEN_FIELD = /(journal|reflection|assessment|answer|session_?note|clinical|diagnos|date_?of_?birth|dob|message|conversation|password|secret|token|api_?key)/i;

export function assertSafeFields(fields: Record<string, unknown>) {
  for (const k of Object.keys(fields)) {
    if (FORBIDDEN_FIELD.test(k)) throw new Error(`Email templates may not include the field "${k}"`);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.theartofconnect.com").replace(/\/$/, "");
const C = { ivory: "#F8F3E9", cream: "#E8D9C5", espresso: "#211C18", gold: "#C5A572", goldText: "#6F5222", burgundy: "#781F35", muted: "#4A4038" };

/** Renders accessible HTML plus a plain-text alternative. */
export function renderEmail({ subject, preheader, heading, paragraphs, action }: EmailContent) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:18px;overflow:hidden;background:${C.ivory};">
<tr><td align="center" style="background:${C.espresso};padding:28px 24px 22px;">
<img src="${SITE}/brand/email-logo.png" width="112" alt="The Art of Connect" style="display:block;border:0;width:112px;height:auto;margin:0 auto 10px;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${C.ivory};letter-spacing:.3px">The Art <i style="color:${C.gold}">of</i> Connect</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${C.gold};text-transform:uppercase;margin-top:8px">In Business. In Life. In Love.</div>
</td></tr>
<tr><td style="height:3px;background:${C.burgundy};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:36px 36px 12px;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:30px;line-height:1.2;color:${C.espresso}">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:${C.muted}">${esc(p)}</p>`).join("")}
${action ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 10px"><tr><td style="border-radius:999px;background:${C.gold}"><a href="${esc(action.url)}" style="display:inline-block;padding:15px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${C.espresso};text-decoration:none;border-radius:999px">${esc(action.label)}</a></td></tr></table>
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.muted}">Or paste this link into your browser:<br><a href="${esc(action.url)}" style="color:${C.goldText};word-break:break-all">${esc(action.url)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:22px 36px 30px;border-top:1px solid ${C.cream};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.muted}">
Connection with intention.<br>
The Art of Connect, LLC · <a href="mailto:info@theartofconnect.com" style="color:${C.goldText}">info@theartofconnect.com</a><br>
For your privacy, we never include journal entries, assessments or private messages in email.
</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, "", ...paragraphs, ...(action ? ["", `${action.label}: ${action.url}`] : []), "", "The Art of Connect, LLC · info@theartofconnect.com", "For your privacy, we never include journal entries, assessments or private messages in email."].join("\n");
  return { html, text };
}

const money = (cents: number, currency = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
const first = (name?: string | null) => (name?.trim() ? name.trim().split(/\s+/)[0] : "there");

function t<F extends Record<string, unknown>>(fields: F, build: (f: F) => EmailContent) {
  assertSafeFields(fields);
  return build(fields);
}

/** Every email the platform sends. Inputs are deliberately minimal. */
export const templates = {
  welcome: (f: { name?: string | null }) =>
    t(f, ({ name }) => ({
      subject: "Welcome to The Art of Connect",
      preheader: "Your membership begins here.",
      heading: `Welcome, ${first(name)}.`,
      paragraphs: ["We’re honored you’ve chosen The Art of Connect. Your account is ready, and your experiences are waiting.", "Begin with yourself — your private space is yours alone."],
      action: { label: "Enter your membership", url: `${SITE}/app` },
    })),
  membershipConfirmed: (f: { name?: string | null; tierName: string; experiences: string[]; amount: number; currency?: string; interval: "month" | "year" }) =>
    t(f, ({ name, tierName, experiences, amount, currency, interval }) => ({
      subject: `Your ${tierName} is confirmed`,
      preheader: `${experiences.join(" · ")} — welcome.`,
      heading: `Your ${tierName} is confirmed.`,
      paragraphs: [`Thank you, ${first(name)}. Your membership includes ${experiences.join(", ")}.`, `Billing: ${money(amount, currency)} per ${interval}. You can change or cancel anytime from My membership.`],
      action: { label: "View my membership", url: `${SITE}/app/membership` },
    })),
  paymentReceipt: (f: { name?: string | null; amount: number; currency?: string; date: string }) =>
    t(f, ({ name, amount, currency, date }) => ({
      subject: "Payment received — thank you",
      preheader: `${money(amount, currency)} received.`,
      heading: "Payment received.",
      paragraphs: [`Thank you, ${first(name)}. We received your payment of ${money(amount, currency)} on ${date}.`, "Your receipt is also available from Stripe, our secure payment provider."],
      action: { label: "My membership", url: `${SITE}/app/membership` },
    })),
  paymentFailed: (f: { name?: string | null; amount: number; currency?: string }) =>
    t(f, ({ name, amount, currency }) => ({
      subject: "Action needed: your payment didn’t go through",
      preheader: "Please update your payment method to keep your membership.",
      heading: "Your payment didn’t go through.",
      paragraphs: [`Hello ${first(name)}, we weren’t able to process your payment of ${money(amount, currency)}.`, "Please review your payment method. Your access continues for now while we retry."],
      action: { label: "Review my membership", url: `${SITE}/app/membership` },
    })),
  refundIssued: (f: { name?: string | null; amount: number; currency?: string }) =>
    t(f, ({ name, amount, currency }) => ({
      subject: "Your refund is on its way",
      preheader: `${money(amount, currency)} refunded.`,
      heading: "Your refund has been issued.",
      paragraphs: [`Hello ${first(name)}, we’ve issued a refund of ${money(amount, currency)}. It usually appears on your statement within 5–10 business days.`],
    })),
  membershipCanceled: (f: { name?: string | null; endDate?: string | null }) =>
    t(f, ({ name, endDate }) => ({
      subject: "Your membership has been canceled",
      preheader: "We’d love to welcome you back anytime.",
      heading: "Your membership has been canceled.",
      paragraphs: [`Hello ${first(name)}, your cancellation is confirmed${endDate ? ` and your access continues until ${endDate}` : ""}.`, "You’re welcome back anytime."],
      action: { label: "Explore memberships", url: `${SITE}/membership` },
    })),
  appointmentReminder: (f: { name?: string | null; when: string; format: "video" | "phone" | "in_person" }) =>
    t(f, ({ name, when, format }) => ({
      subject: "Reminder: your upcoming appointment",
      preheader: `Your appointment is ${when}.`,
      heading: "A gentle reminder.",
      // Deliberately no professional name, topic or notes — confidentiality first.
      paragraphs: [`Hello ${first(name)}, you have an upcoming ${format.replace("_", "-")} appointment on ${when}.`, "Details are available privately in your In Life space."],
      action: { label: "View appointment", url: `${SITE}/app/counseling` },
    })),
  professionalApplicationReceived: (f: { name?: string | null }) =>
    t(f, ({ name }) => ({
      subject: "We’ve received your professional application",
      preheader: "Our team reviews every application personally.",
      heading: "Thank you for applying.",
      paragraphs: [`Hello ${first(name)}, we’ve received your application to join The Art of Connect as a professional.`, "Our team will verify your credentials and contact you with next steps."],
    })),
  professionalDecision: (f: { name?: string | null; decision: "approved" | "rejected" | "more_info" }) =>
    t(f, ({ name, decision }) => ({
      subject: decision === "approved" ? "Your professional application is approved" : "An update on your professional application",
      preheader: decision === "approved" ? "Welcome to The Art of Connect." : "An update from our team.",
      heading: decision === "approved" ? "Welcome, and congratulations." : "An update on your application.",
      paragraphs:
        decision === "approved"
          ? [`Hello ${first(name)}, your credentials have been verified and your application is approved.`, "Choose your professional membership to publish your profile."]
          : decision === "more_info"
            ? [`Hello ${first(name)}, we need a little more information to complete your review. Please reply to this email.`]
            : [`Hello ${first(name)}, thank you for your interest. After careful review, we’re unable to approve your application at this time.`],
      action: decision === "approved" ? { label: "Continue", url: `${SITE}/app` } : undefined,
    })),
  passwordReset: (f: { name?: string | null; link: string }) =>
    t(f, ({ name, link }) => ({
      // A unique subject keeps each link in its own email (Gmail otherwise threads them and opens an older, used link).
      subject: `Reset your password — The Art of Connect · Ref ${Math.floor(1000 + Math.random() * 9000)}`,
      preheader: "Your secure link to choose a new password.",
      heading: "Reset your password.",
      paragraphs: [`Hello ${first(name)}, we received a request to reset your password. Use the secure link below — it works once and expires within the hour.`, "If you didn’t ask for this, you can ignore this email; your password stays the same."],
      action: { label: "Choose a new password", url: link },
    })),
  journeyCheckin: (f: { subject: string; topic: string | null; link: string }) =>
    t(f, ({ subject, topic, link }) => ({
      subject,
      preheader: "A gentle check-in from Journey — whenever you’re ready.",
      heading: "Journey is thinking of you.",
      paragraphs: [
        topic ? `You asked Journey to check in about “${topic}”. Whenever you’re ready, Journey would love to hear how it went.` : "Journey has a check-in waiting for you in your private dashboard.",
        "There’s no need to reply right away — your check-in will be there whenever the moment feels right. You can change or pause check-ins any time.",
      ],
      action: { label: "Open my check-in", url: link },
    })),
  staffInvitation: (f: { roles: string; link: string }) =>
    t(f, ({ roles, link }) => ({
      subject: "You’re invited to The Art of Connect team",
      preheader: "Set your password and secure your Owner Portal access.",
      heading: "Welcome to the team.",
      paragraphs: [`You’ve been invited to The Art of Connect Owner Portal with these permissions: ${roles}.`, "Use the secure link below to choose your password. You’ll then set up two-step verification with an authenticator app — it’s required for every team member. The link works once and expires within the hour."],
      action: { label: "Accept invitation", url: link },
    })),
  ownerAlert: (f: { title: string; summary: string; portalPath: string }) =>
    t(f, ({ title, summary, portalPath }) => ({
      subject: `[Owner alert] ${title}`,
      preheader: summary,
      heading: title,
      // Owner alerts never include member private content — only what happened and where to review it.
      paragraphs: [summary, "Review the details securely in your Owner Portal (MFA required)."],
      action: { label: "Open Owner Portal", url: `${SITE}${portalPath}` },
    })),
};
