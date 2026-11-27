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

// ─── Professional onboarding (directives 33–34): upload, Journey enhancement, approval, master history ───

/** Upload an existing résumé (PDF or Word). The original is preserved unchanged in private storage; its text is read on our server. */
export async function uploadResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return fail("Choose a PDF or Word (.docx) file.");
  const { UPLOAD_TYPES, sniff, extractText } = await import("@/lib/resume-extract");
  if (!UPLOAD_TYPES[file.type]) return fail("Please upload a PDF or Word (.docx) file.");
  if (file.size > 5 * 1024 * 1024) return fail("Please upload a file under 5 MB.");
  const buf = new Uint8Array(await file.arrayBuffer());
  if (!sniff(buf, file.type)) return fail("That file doesn't look like a valid PDF or Word document.");
  const { createHash, randomUUID } = await import("node:crypto");
  const sha = createHash("sha256").update(buf).digest("hex");
  let text = "";
  try { text = (await extractText(buf, file.type)).trim(); } catch { text = ""; }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return fail("Uploads aren't available right now.");
  const path = `u/${m.viewer.id}/${randomUUID()}.${UPLOAD_TYPES[file.type]}`;
  const { error: se } = await admin.storage.from("resume-uploads").upload(path, buf, { contentType: file.type, upsert: false });
  if (se) return fail("That file couldn't be stored. Please try again.");
  const { data: up, error } = await admin.from("resume_uploads").insert({
    user_id: m.viewer.id, storage_path: path, file_name: file.name.slice(0, 255), mime_type: file.type, size_bytes: file.size, sha256: sha, extracted_text: text || null,
  }).select("id").single();
  if (error || !up) { await admin.storage.from("resume-uploads").remove([path]); return fail("That file couldn't be saved."); }
  revalidatePath("/app/career");
  redirect(`/app/career/upload/${up.id}`);
}

/** Journey prepares an enhanced draft from an uploaded résumé (paid memberships; uses the member's Journey allowance). */
export async function enhanceUpload(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  if (!hasPaidAccess(m.viewer)) return fail("Journey's personalized enhancement is part of paid memberships. You can still build your résumé with our guided templates.");
  const { data: up } = await m.db.from("resume_uploads").select("id, file_name, extracted_text").eq("id", String(f.get("id") ?? "")).maybeSingle();
  if (!up) return fail("Unknown upload.");
  if (!up.extracted_text || up.extracted_text.length < 200) return fail("We couldn't read enough text from this file (it may be a scanned image). Try a Word version, or build your résumé with the guided form.");
  const { stripContact, parseEnhanced, verifyAgainstSource } = await import("@/lib/resume-ai");
  const { sendJourneyMessage } = await import("@/lib/journey-server");
  const { randomUUID } = await import("node:crypto");
  const contact = stripContact(up.extracted_text);
  const industry = String(f.get("industry") ?? "").trim().slice(0, 80) || null;
  const reply = await sendJourneyMessage({ mode: "business", message: "resume", requestKey: randomUUID(), resume: { text: contact.cleaned, industry }, ownerTest: m.viewer.roles.length > 0 });
  if (!reply.ok) return fail(reply.message);
  const parsed = parseEnhanced(reply.reply, contact);
  if (!parsed) return fail("Journey's draft didn't come back in a usable form. This didn't use a message; please try again.");
  const checked = verifyAgainstSource(parsed, up.extracted_text);
  const { data: row, error } = await m.db.from("resumes").insert({
    user_id: m.viewer.id, kind: "resume", template: "signature", title: `Enhanced: ${up.file_name}`.slice(0, 120), data: checked.data,
    status: "pending_approval", source: "journey_enhanced", upload_id: up.id, review: { questions: checked.questions, changes: checked.changes, from: up.file_name },
  }).select("id").single();
  if (error || !row) return fail("The draft couldn't be saved.");
  revalidatePath("/app/career");
  redirect(`/app/career/resume/${row.id}`);
}

/** The member approves a résumé as accurate (only the member can). Optionally makes it the master professional history. */
export async function approveResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  if (f.get("accurate") !== "on") return fail("Please confirm that everything in this résumé is accurate.");
  const id = String(f.get("id") ?? "");
  const { error } = await m.db.from("resumes").update({ status: "approved" }).eq("id", id).eq("kind", "resume");
  if (error) return fail("That couldn't be approved.");
  if (f.get("master") === "on") {
    await m.db.from("resumes").update({ is_master: false }).eq("user_id", m.viewer.id).eq("is_master", true).neq("id", id);
    await m.db.from("resumes").update({ is_master: true }).eq("id", id);
  }
  revalidatePath("/app/career"); refresh(id);
  return { ok: true, message: "Approved. Thank you for confirming it's accurate." };
}

/** A tailored copy of the master history for a specific opportunity (the master itself stays unchanged). */
export async function tailorResume(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!m) return PREVIEW;
  const { data: r } = await m.db.from("resumes").select("id, template, data").eq("id", String(f.get("id") ?? "")).eq("kind", "resume").maybeSingle();
  if (!r) return fail("Unknown résumé.");
  const opportunity = String(f.get("opportunity") ?? "").trim().slice(0, 160);
  if (opportunity.length < 3) return fail("Name the opportunity or role this version is for.");
  const { data: row, error } = await m.db.from("resumes").insert({ user_id: m.viewer.id, kind: "resume", template: r.template, title: `For: ${opportunity}`.slice(0, 120), data: r.data, parent_id: r.id, opportunity }).select("id").single();
  if (error || !row) return fail("That version couldn't be created.");
  revalidatePath("/app/career");
  redirect(`/app/career/resume/${row.id}`);
}
