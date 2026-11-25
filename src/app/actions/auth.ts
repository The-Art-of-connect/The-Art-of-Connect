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

  if (!(await allow("sign-in", 10, 900))) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in is not available yet." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: never reveal whether an account exists.
  if (error) return { error: "Those details don’t match our records." };
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
  experiences: z.array(z.enum(["business", "counseling", "relationships"])).min(1, "Choose at least one experience.").max(3),
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
    interval: form.get("interval") === "year" ? "year" : "month",
    couples: form.get("couples") === "1",
    loveStatus: (form.get("loveStatus") as "single" | "couple" | null) || null,
    addons: form.getAll("addons").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const d = parsed.data;

  const dob = new Date(Date.UTC(d.dobYear, d.dobMonth - 1, d.dobDay));
  if (dob.getUTCMonth() !== d.dobMonth - 1 || dob.getUTCDate() !== d.dobDay) return { error: "Please enter a valid date of birth." };
  const { minimum_member_age } = await getCatalogue();
  if ((await ageOn(dob)) < minimum_member_age) {
    return { error: `The Art of Connect is exclusively for adults ${minimum_member_age} and older.` };
  }

  if (!(await allow("sign-up", 5, 3600))) return { error: "Too many attempts. Please try again later." };
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
