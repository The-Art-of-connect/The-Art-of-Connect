"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLaunchState } from "@/lib/launch";
import { env } from "@/lib/env";

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

  const supabase = await createClient();
  if (!supabase) return { error: "Sign-in is not available yet." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: never reveal whether an account exists.
  if (error) return { error: "Those details don’t match our records." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const launch = await getLaunchState();
  if (!launch.registrations_open) return { error: "Membership is currently by invitation only." };

  const parsed = z
    .object({ email: z.email(), password: z.string().min(12, "Use at least 12 characters."), displayName: z.string().trim().min(1).max(80) })
    .safeParse({ email: form.get("email"), password: form.get("password"), displayName: form.get("displayName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const supabase = await createClient();
  if (!supabase) return { error: "Registration is not available yet." };
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: `${env.siteUrl}/auth/callback` },
  });
  if (error) return { error: "We couldn’t create your account. Please try again." };
  return { notice: "Check your inbox to confirm your email." };
}
