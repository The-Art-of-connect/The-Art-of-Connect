"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().max(120).optional(),
  interests: z.array(z.enum(["relationships", "business", "counseling"])).max(3),
  isCounselor: z.boolean(),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export type WaitlistState = { ok: boolean; message: string } | null;

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    fullName: String(form.get("fullName") ?? "") || undefined,
    interests: form.getAll("interests").map(String),
    isCounselor: form.get("isCounselor") === "on",
    website: String(form.get("website") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  if (parsed.data.website) return { ok: true, message: "Thank you." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Invitations open soon. Please write to info@theartofconnect.com." };

  const { error } = await supabase.from("waitlist").insert({
    email: parsed.data.email,
    full_name: parsed.data.fullName ?? null,
    interests: parsed.data.interests,
    is_counselor: parsed.data.isCounselor,
    source: "website",
  });
  // A duplicate email is treated as success so the form never reveals who has signed up.
  if (error && error.code !== "23505") return { ok: false, message: "Something went wrong. Please try again shortly." };
  return { ok: true, message: "You’re on the list. We’ll be in touch personally before doors open." };
}
