"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ATTR_COOKIE, REF_COOKIE, parseAttribution } from "@/lib/attribution";
import { checkPromotion } from "@/lib/catalogue";
import type { Promotion } from "@/lib/pricing";

const schema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().max(120).optional(),
  interests: z.array(z.enum(["relationships", "business", "counseling"])).max(3),
  loveTrack: z.enum(["single", "couple"]).nullable(),
  desiredTier: z.string().max(40).nullable(),
  desiredInterval: z.enum(["month", "year"]).nullable(),
  couples: z.boolean(),
  addons: z.array(z.string().max(40)).max(20),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export type WaitlistState = { ok: boolean; message: string } | null;

/**
 * Optional pre-launch list: "notify me when enrollment opens". Records the
 * membership the visitor built, plus first-party campaign attribution.
 */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    fullName: String(form.get("fullName") ?? "") || undefined,
    interests: form.getAll("interests").map(String),
    loveTrack: (form.get("loveTrack") as "single" | "couple" | null) || null,
    desiredTier: (form.get("desiredTier") as string | null) || null,
    desiredInterval: (form.get("desiredInterval") as "month" | "year" | null) || null,
    couples: form.get("couples") === "1",
    addons: form.getAll("addons").map(String),
    website: String(form.get("website") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  const d = parsed.data;
  if (d.website) return { ok: true, message: "Thank you." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Enrollment opens soon. Please write to info@theartofconnect.com." };

  const jar = await cookies();
  const { error } = await supabase.from("waitlist").insert({
    email: d.email,
    full_name: d.fullName ?? null,
    interests: d.interests,
    // Relationship status is only asked (and kept) when In Love is chosen.
    love_track: d.interests.includes("relationships") ? d.loveTrack : null,
    desired_tier: d.desiredTier,
    desired_interval: d.desiredInterval,
    couples_upgrade: d.couples && d.interests.includes("relationships"),
    addons: d.addons,
    referral_code: jar.get(REF_COOKIE)?.value ?? null,
    attribution: parseAttribution(jar.get(ATTR_COOKIE)?.value),
    source: "website",
  });
  // A duplicate email is treated as success so the form never reveals who has signed up.
  if (error && error.code !== "23505") return { ok: false, message: "Something went wrong. Please try again shortly." };
  return { ok: true, message: "Thank you. We’ll email you the moment membership enrollment opens." };
}

/** Validates a promotional code for the membership builder. */
export async function validatePromo(code: string): Promise<Promotion | null> {
  return checkPromotion(String(code ?? ""));
}
