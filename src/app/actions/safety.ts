"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export type SafetyState = { ok: boolean; message: string } | null;

const REASONS = ["harassment", "fake_profile", "scam_or_fraud", "inappropriate_content", "underage", "safety_concern", "other"] as const;

/** Member reports a concern about another member. */
export async function reportMember(_p: SafetyState, f: FormData): Promise<SafetyState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in." };
  if (!(await allow(`report:${viewer.id}`, 10, 86400))) return { ok: false, message: "You’ve sent several reports today. Our team is reviewing them." };
  const parsed = z
    .object({
      reportedUserId: z.uuid().optional(),
      experience: z.enum(["relationships", "business"]),
      reason: z.enum(REASONS),
      details: z.string().trim().min(10, "Please describe what happened.").max(4000),
      alsoBlock: z.boolean(),
    })
    .safeParse({
      reportedUserId: (f.get("reportedUserId") as string) || undefined,
      experience: f.get("experience"),
      reason: f.get("reason"),
      details: f.get("details"),
      alsoBlock: f.get("alsoBlock") === "on",
    });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please complete the form." };
  const d = parsed.data;
  if (d.reportedUserId === viewer.id) return { ok: false, message: "You can’t report yourself." };

  const supabase = (await createClient())!;
  const { error } = await supabase.from("moderation_reports").insert({
    reporter_id: viewer.id,
    reported_user_id: d.reportedUserId ?? null,
    experience: d.experience,
    reason: d.reason,
    details: d.details,
  });
  if (error) return { ok: false, message: error.code === "23505" ? "You’ve already reported this member today. Our team has it." : "Your report couldn’t be sent. Please email info@theartofconnect.com." };
  if (d.alsoBlock && d.reportedUserId) await supabase.from("blocks").upsert({ blocker_id: viewer.id, blocked_id: d.reportedUserId });
  revalidatePath("/app/safety");
  return { ok: true, message: "Thank you. Our safety team will review your report. If you are in danger, call 911." };
}

export async function blockMember(_p: SafetyState, f: FormData): Promise<SafetyState> {
  const viewer = await getViewer();
  const id = z.uuid().safeParse(f.get("userId"));
  if (!viewer || !id.success || id.data === viewer.id) return { ok: false, message: "Invalid request." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("blocks").upsert({ blocker_id: viewer.id, blocked_id: id.data });
  if (error) return { ok: false, message: "Could not block this member." };
  revalidatePath("/app/safety");
  return { ok: true, message: "Blocked. You won’t see each other, and any connection has been closed." };
}

export async function unblockMember(_p: SafetyState, f: FormData): Promise<SafetyState> {
  const viewer = await getViewer();
  const id = z.uuid().safeParse(f.get("userId"));
  if (!viewer || !id.success) return { ok: false, message: "Invalid request." };
  const supabase = (await createClient())!;
  await supabase.from("blocks").delete().eq("blocker_id", viewer.id).eq("blocked_id", id.data);
  revalidatePath("/app/safety");
  return { ok: true, message: "Unblocked." };
}
