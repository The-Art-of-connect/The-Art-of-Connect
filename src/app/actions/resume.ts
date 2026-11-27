"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, hasPaidAccess, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emptyLetter, emptyResume, normalizeLetter, normalizeResume, TEMPLATES } from "@/lib/resume";

/**
 * Professional Résumé Builder (founder directive 31). Complimentary for every account; records are private to the member
 * (database policies enforce it). Nothing here calls an AI service or sends résumé data anywhere.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const fail = (message: string): R => ({ ok: false, message });
const PREVIEW = fail("Preview only: sign in with your own account to save.");
const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key) as [string, ...string[]];

async function me() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const refresh = (id?: string) => { revalidatePath("/app/career/resume"); if (id) revalidatePath(`/app/career/resume/${id}`); };

export async function createResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const template = z.enum(TEMPLATE_KEYS).safeParse(f.get("template"));
  if (!template.success) return fail("Choose a template.");
  const kind = template.data === "letter" ? "letter" : "resume";
  // Start from the member's most recent résumé contact details, if any, so they don't retype them.
  const { data: last } = await m.db.from("resumes").select("data").eq("user_id", m.viewer.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const contact = last?.data ? normalizeResume(last.data).contact : emptyResume().contact;
  const data = kind === "letter" ? { ...emptyLetter(), contact } : { ...emptyResume(), contact };
  const title = String(f.get("title") ?? "").trim().slice(0, 120) || (kind === "letter" ? "Cover letter" : "My résumé");
  const { data: row, error } = await m.db.from("resumes").insert({ user_id: m.viewer.id, kind, template: template.data, title, data }).select("id").single();
  if (error || !row) return fail(error?.message.includes("25 résumés") ? "You can keep up to 25 résumés and letters. Remove one to add another." : "That couldn't be created. Please try again.");
  refresh();
  redirect(`/app/career/resume/${row.id}`);
}

/** Saves the editor's content. Called directly from the editor (not a form). */
export async function saveResume(id: string, title: string, template: string, raw: unknown): Promise<{ ok: boolean; message: string; savedAt?: string }> {
  const m = await me(); if (!m) return { ok: false, message: "Preview only: sign in with your own account to save." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown résumé." };
  const { data: row } = await m.db.from("resumes").select("kind").eq("id", id).maybeSingle();
  if (!row) return { ok: false, message: "Unknown résumé." };
  const t = z.enum(TEMPLATE_KEYS).safeParse(template);
  const tpl = row.kind === "letter" ? "letter" : t.success && t.data !== "letter" ? t.data : "signature";
  const data = row.kind === "letter" ? normalizeLetter(raw) : normalizeResume(raw);
  const { error } = await m.db.from("resumes").update({ title: title.trim().slice(0, 120) || "My résumé", template: tpl, data }).eq("id", id);
  if (error) return { ok: false, message: "That couldn't be saved. Please try again." };
  refresh(id);
  return { ok: true, message: "Saved", savedAt: new Date().toISOString() };
}

export async function saveVersion(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const id = String(f.get("id") ?? "");
  const { data: r } = await m.db.from("resumes").select("id, template, data").eq("id", id).maybeSingle();
  if (!r) return fail("Unknown résumé.");
  const label = String(f.get("label") ?? "").trim().slice(0, 120) || null;
  const { error } = await m.db.from("resume_versions").insert({ resume_id: r.id, version: 0, label, template: r.template, data: r.data });
  if (error) return fail("That version couldn't be saved.");
  refresh(id);
  return { ok: true, message: "Version saved. You can return to it any time." };
}

export async function restoreVersion(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const { data: v } = await m.db.from("resume_versions").select("resume_id, template, data, version").eq("id", String(f.get("version_id") ?? "")).maybeSingle();
  if (!v) return fail("Unknown version.");
  // Keep the current content as a version first, so restoring never loses work.
  const { data: cur } = await m.db.from("resumes").select("template, data").eq("id", v.resume_id).single();
  if (cur) await m.db.from("resume_versions").insert({ resume_id: v.resume_id, version: 0, label: "Before restoring", template: cur.template, data: cur.data });
  const { error } = await m.db.from("resumes").update({ template: v.template, data: v.data }).eq("id", v.resume_id);
  if (error) return fail("That version couldn't be restored.");
  refresh(v.resume_id);
  return { ok: true, message: `Version ${v.version} restored. Your previous content was saved as a version.` };
}

export async function duplicateResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const { data: r } = await m.db.from("resumes").select("kind, template, title, data").eq("id", String(f.get("id") ?? "")).maybeSingle();
  if (!r) return fail("Unknown résumé.");
  const { data: row, error } = await m.db.from("resumes").insert({ user_id: m.viewer.id, kind: r.kind, template: r.template, title: `${r.title} (copy)`.slice(0, 120), data: r.data }).select("id").single();
  if (error || !row) return fail("That couldn't be copied.");
  refresh();
  redirect(`/app/career/resume/${row.id}`);
}

export async function deleteResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm.");
  const { error } = await m.db.from("resumes").delete().eq("id", String(f.get("id") ?? ""));
  if (error) return fail("That couldn't be removed.");
  refresh();
  redirect("/app/career/resume");
}

/** Paid members may authorize a résumé for their professional Opportunity Portfolio (CONNECT 360). */
export async function setPortfolio(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  if (!hasPaidAccess(m.viewer)) return fail("Connecting a résumé to your Opportunity Portfolio is part of paid memberships.");
  const id = String(f.get("id") ?? "");
  const on = f.get("on") === "1";
  const { error } = await m.db.from("resumes").update({ portfolio_authorized: on }).eq("id", id);
  if (error) return fail("That couldn't be updated.");
  refresh(id);
  return { ok: true, message: on ? "Authorized for your Opportunity Portfolio. You can withdraw this at any time." : "Removed from your Opportunity Portfolio." };
}
