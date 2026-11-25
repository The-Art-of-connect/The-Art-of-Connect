"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Owner review while previewing the site: approve a page, ask for changes,
 * ask for more, or switch it to "Coming soon" for members. Owner and
 * executives only; every decision is audited.
 */
const REVIEWERS = ["owner", "executive"] as const;
const Path = z.string().regex(/^\/[A-Za-z0-9/_-]{0,200}$/);

const LABEL: Record<string, string> = {
  approve: "Approved",
  changes: "Change request saved",
  add_more: "Saved: add more to this page",
  coming_soon: "Saved and switched to Coming soon",
};

export async function savePageReview(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff([...REVIEWERS]);
  const parsed = z.object({
    path: Path,
    decision: z.enum(["approve", "changes", "add_more", "coming_soon"]),
    notes: z.string().trim().max(4000).optional(),
  }).safeParse({ path: form.get("path"), decision: form.get("decision"), notes: String(form.get("notes") ?? "") || undefined });
  if (!parsed.success) return { ok: false, message: "Choose a decision first." };
  const { path, decision, notes } = parsed.data;
  if ((decision === "changes" || decision === "add_more") && !notes) return { ok: false, message: "Add a note so the change is clear." };

  const supabase = (await createClient())!;
  const { error } = await supabase.from("page_reviews").insert({ path, decision, notes: notes ?? null, created_by: viewer.id });
  if (error) return { ok: false, message: "Your review wasn't saved. Please try again." };
  if (decision === "coming_soon" || decision === "approve") {
    await supabase.from("section_status").upsert({
      path, status: decision === "coming_soon" ? "coming_soon" : "live", member_note: null, updated_by: viewer.id, updated_at: new Date().toISOString(),
    });
  }
  await audit(`review.${decision}`, "page_reviews", path, { notes: notes ?? null });
  revalidatePath("/", "layout");
  return { ok: true, message: LABEL[decision] };
}

export async function setSectionStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const viewer = await requireStaff([...REVIEWERS]);
  const parsed = z.object({ path: Path, status: z.enum(["live", "coming_soon"]) }).safeParse({ path: form.get("path"), status: form.get("status") });
  if (!parsed.success) return { ok: false, message: "Unknown page." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("section_status").upsert({ ...parsed.data, updated_by: viewer.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: "The change wasn't saved." };
  await audit(`section.${parsed.data.status}`, "section_status", parsed.data.path);
  revalidatePath("/", "layout");
  return { ok: true, message: parsed.data.status === "live" ? "Open to members" : "Coming soon for members" };
}

export async function resolveReview(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff([...REVIEWERS]);
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "Unknown review." };
  const supabase = (await createClient())!;
  const { error } = await supabase.from("page_reviews").update({ resolved: true }).eq("id", id.data);
  if (error) return { ok: false, message: "Not saved." };
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Marked done" };
}
