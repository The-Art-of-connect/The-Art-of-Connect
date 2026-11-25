"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLaunchState } from "@/lib/launch";
import { getCatalogue } from "@/lib/catalogue";
import { ATTR_COOKIE, REF_COOKIE, parseAttribution } from "@/lib/attribution";
import { env } from "@/lib/env";
import { allow } from "@/lib/ratelimit";
import { isDisposableEmail, logSecurityEvent } from "@/lib/security";
import { BOT_CHECK_MESSAGE, verifyTurnstile } from "@/lib/turnstile";

export type AuthState = { error?: string; notice?: string } | null;

const safeNext = (next: unknown) => {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
};

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.email(), password: z.string().min(8) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };
  const email = parsed.data.email.toLowerCase();

  if (!(await allow("sign-in", 10, 900))) {
    await logSecurityEvent("rate_limited", { email, details: { form: "sign-in" } });
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  if (!(await verifyTurnstile(form, "sign_in", email)).ok) return { error: BOT_CHECK_MESSAGE };
  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in is not available yet." };
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: never reveal whether an account exists.
  if (error) {
    await logSecurityEvent("login_failed", { email, details: { reason: error.code ?? "invalid_credentials" } });
    return { error: "Those details don’t match our records." };
  }
  await logSecurityEvent("login_succeeded", { email, userId: data.user?.id });
  redirect(safeNext(form.get("next")));
}

/** Whole years between a date of birth and today (UTC). */
export async function ageOn(dob: Date, today = new Date()) {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

const joinSchema = z.object({
  displayName: z.string().trim().min(1, "Please enter your first name.").max(80),
  email: z.email("Please enter a valid email."),
  password: z.string().min(12, "Use at least 12 characters for your password."),
  dobYear: z.coerce.number().int().min(1900).max(new Date().getUTCFullYear()),
  dobMonth: z.coerce.number().int().min(1).max(12),
  dobDay: z.coerce.number().int().min(1).max(31),
  agree: z.literal("on", { message: "Please agree to the Terms and Privacy Policy." }),
  experiences: z.array(z.enum(["business", "counseling", "relationships"])).max(3),
  package: z.string().max(40).nullable(),
  interval: z.enum(["month", "year"]),
  couples: z.boolean(),
  loveStatus: z.enum(["single", "couple"]).nullable(),
  addons: z.array(z.string().max(40)).max(20),
});

/**
 * Consumer registration. Open to everyone who meets the age requirement once
 * the owner opens enrollment — no invitation or manual approval. The age check
 * here gives a friendly message; the database enforces it again at sign-up.
 */
export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const launch = await getLaunchState();
  if (!launch.registrations_open) return { error: "Membership enrollment opens soon." };

  const parsed = joinSchema.safeParse({
    displayName: form.get("displayName"),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: form.get("password"),
    dobYear: form.get("dobYear"),
    dobMonth: form.get("dobMonth"),
    dobDay: form.get("dobDay"),
    agree: form.get("agree"),
    experiences: form.getAll("experiences").map(String),
    package: String(form.get("package") ?? "").trim() || null,
    interval: form.get("interval") === "year" ? "year" : "month",
    couples: form.get("couples") === "1",
    loveStatus: (form.get("loveStatus") as "single" | "couple" | null) || null,
    addons: form.getAll("addons").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const d = parsed.data;
  if (!d.experiences.length && !d.package) return { error: "Choose at least one experience." };
  if (!(await allow("sign-up", 5, 3600))) {
    await logSecurityEvent("rate_limited", { email: d.email, details: { form: "sign-up" } });
    return { error: "Too many attempts. Please try again later." };
  }
  if (!(await verifyTurnstile(form, "sign_up", d.email)).ok) return { error: BOT_CHECK_MESSAGE };
  await logSecurityEvent("signup_attempt", { email: d.email });
  if (isDisposableEmail(d.email)) {
    await logSecurityEvent("signup_blocked", { email: d.email, details: { reason: "disposable_email" } });
    return { error: "Please use a permanent email address." };
  }

  const dob = new Date(Date.UTC(d.dobYear, d.dobMonth - 1, d.dobDay));
  if (dob.getUTCMonth() !== d.dobMonth - 1 || dob.getUTCDate() !== d.dobDay) return { error: "Please enter a valid date of birth." };
  const { minimum_member_age } = await getCatalogue();
  if ((await ageOn(dob)) < minimum_member_age) {
    return { error: `The Art of Connect is exclusively for adults ${minimum_member_age} and older.` };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Registration is not available yet." };
  const jar = await cookies();
  const { error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/app/onboarding`,
      data: {
        display_name: d.displayName,
        account_type: "member",
        // Moved into private storage and removed from the account metadata by the database.
        date_of_birth: dob.toISOString().slice(0, 10),
        referral_code: jar.get(REF_COOKIE)?.value ?? null,
        attribution: parseAttribution(jar.get(ATTR_COOKIE)?.value),
        selection: {
          experiences: d.experiences,
          package: d.package,
          interval: d.interval,
          couples: d.couples && d.experiences.includes("relationships"),
          love_status: d.experiences.includes("relationships") ? d.loveStatus : null,
          addons: d.addons,
        },
        accepted_terms_at: new Date().toISOString(),
      },
    },
  });
  if (error) {
    if (/adults|date of birth/i.test(error.message)) return { error: error.message };
    return { error: "We couldn’t create your account. Please try again." };
  }
  return { notice: "Welcome. Please check your inbox to confirm your email, then sign in to complete your membership." };
}

/** Account recovery: always the same response, so it never reveals whether an account exists. */
export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const generic = { notice: "If an account exists for that email, a secure reset link is on its way. It expires shortly." };
  if (!email.success) return { error: "Please enter a valid email." };
  if (!(await allow("password-reset", 3, 3600))) {
    await logSecurityEvent("rate_limited", { email: email.data, details: { form: "password-reset" } });
    return generic;
  }
  if (!(await verifyTurnstile(form, "password_reset", email.data)).ok) return { error: BOT_CHECK_MESSAGE };
  await logSecurityEvent("password_reset_requested", { email: email.data });
  // Branded link sent through our own email service (Resend). Nothing is sent
  // — and the response is identical — when no account exists.
  const { isEmailConfigured, sendEmail } = await import("@/lib/email");
  if (isEmailConfigured()) {
    const { createAccountLink } = await import("@/lib/account-links");
    const { templates } = await import("@/lib/email-templates");
    const made = await createAccountLink(email.data, "recovery");
    if (made) await sendEmail(email.data, templates.passwordReset({ link: made.link }), { category: "account" });
    return generic;
  }
  const supabase = await createClient();
  if (supabase) await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password` });
  return generic;
}

export async function setNewPassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The passwords don’t match." };
  const supabase = await createClient();
  if (!supabase) return { error: "Not available." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Your password could not be changed. Please request a new link." };
  await logSecurityEvent("password_changed", { userId: data.user.id, email: data.user.email ?? undefined });
  // Team members continue to the Owner Portal, which requires two-step verification first.
  const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", data.user.id).limit(1);
  if (staff?.length) redirect("/admin");
  return { notice: "Your password has been changed. You can now sign in." };
}

/** Completes a one-time account link (password reset or team invitation) after the person presses Continue. */
export async function confirmAccountLink(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ type: z.enum(["recovery", "invite"]), tokenHash: z.string().min(10).max(500) })
    .safeParse({ type: form.get("type"), tokenHash: form.get("token_hash") });
  if (!parsed.success) return { error: "This link is incomplete. Please request a new one." };
  if (!(await allow("account-link", 10, 900))) return { error: "Too many attempts. Please wait a few minutes." };
  const supabase = await createClient();
  if (!supabase) return { error: "Not available." };
  const { data, error } = await supabase.auth.verifyOtp({ type: parsed.data.type, token_hash: parsed.data.tokenHash });
  if (error || !data.user) {
    await logSecurityEvent("login_failed", { details: { reason: "expired_or_used_link", form: parsed.data.type } });
    return { error: "This link has expired or was already used. Please request a new one." };
  }
  redirect(parsed.data.type === "invite" ? "/reset-password?welcome=1" : "/reset-password");
}
