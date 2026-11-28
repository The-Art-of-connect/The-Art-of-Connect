"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendly } from "@/lib/connect360";
import { APPLICATION_STATUS, OPPORTUNITY_KINDS, WATCH_FREQUENCY, WATCH_KINDS, normalizeChecklist, parseChecklist } from "@/lib/radar";

/**
 * My Global Watchlist, Opportunity Radar and the Application Center (directives 25, 32, 33; directive 51 item 4).
 * The database enforces entitlement, privacy (own records only), owner-curated opportunities and approved résumés.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string): R => ({ ok: true, message });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const uuid = (v: string) => z.string().uuid().safeParse(v).success;
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const httpsUrl = (v: string) => /^https:\/\/[^\s]+$/.test(v) && v.length <= 1000;
const WATCH = "/app/connect360/intelligence/watchlist", RADAR = "/app/connect360/radar", APPS = "/app/connect360/applications";

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

// ─── My Global Watchlist ────────────────────────────────────────────────────────────────────────────────────────────────
export async function addWatch(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: sign in with your own account.");
  const kind = str(f, "subject_kind", 20), subject = str(f, "subject", 160), objective = str(f, "objective", 1000), frequency = str(f, "frequency", 10);
  if (!(kind in WATCH_KINDS)) return fail("Choose what you're watching.");
  if (subject.length < 2) return fail("Name the company, topic or person you'd like to watch.");
  if (objective.length < 5) return fail("Tell us what you'd like to know about it, in a few words.");
  const { error } = await m.db.from("intel_watchlist").insert({
    user_id: m.viewer.id, subject_kind: kind, subject, objective, region: str(f, "region", 120) || null,
    frequency: frequency in WATCH_FREQUENCY ? frequency : "weekly",
  });
  if (error) return fail(friendly(error.message, /full/.test(error.message) ? "Your watchlist is full. Remove an item to add another." : /Elite Concierge/.test(error.message) ? "My Global Watchlist is part of Elite Concierge." : "That couldn't be added."));
  revalidatePath(WATCH); revalidatePath(RADAR); revalidatePath("/app/world");
  return ok(`Added. ${subject} is on your watchlist.`);
}

export async function setWatchPaused(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const id = str(f, "id", 40);
  if (!uuid(id)) return fail("Unknown item.");
  const paused = f.get("paused") === "1";
  const { error } = await m.db.from("intel_watchlist").update({ paused }).eq("id", id).eq("user_id", m.viewer.id);
  revalidatePath(WATCH);
  return error ? fail("That couldn't be changed.") : ok(paused ? "Paused. It stays on your watchlist." : "Resumed.");
}

export async function removeWatch(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const id = str(f, "id", 40);
  if (!uuid(id)) return fail("Unknown item.");
  const { error } = await m.db.from("intel_watchlist").delete().eq("id", id).eq("user_id", m.viewer.id);
  revalidatePath(WATCH); revalidatePath(RADAR); revalidatePath("/app/world");
  return error ? fail("That couldn't be removed.") : ok("Removed from your watchlist. Your research findings are unchanged.");
}

// ─── Opportunity Radar ──────────────────────────────────────────────────────────────────────────────────────────────────
export async function saveRadarPrefs(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: nothing is saved.");
  const opted_in = f.get("opted_in") === "on";
  const categories = f.getAll("categories").map(String).filter((c) => c in OPPORTUNITY_KINDS);
  const industries = [...new Set(f.getAll("industries").map(String).filter((s) => /^[a-z0-9-]{2,60}$/.test(s)))].slice(0, 20);
  const { error } = await m.db.from("radar_preferences").upsert({ user_id: m.viewer.id, opted_in, categories, industries, keywords: str(f, "keywords", 500) || null, updated_at: new Date().toISOString() });
  revalidatePath(RADAR);
  if (error) return fail("Your preferences couldn't be saved.");
  return ok(opted_in ? "Saved. Your Opportunity Radar now shows opportunities that match your interests." : "Saved. Matching is off; nothing is matched to you until you turn it on.");
}

export async function markRadarItem(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only.");
  const source = str(f, "source", 20), item = str(f, "item", 40), state = str(f, "state", 20);
  if (!["opportunity", "finding"].includes(source) || !uuid(item)) return fail("Unknown item.");
  const q = m.db.from("radar_marks");
  const { error } = state === "clear"
    ? await q.delete().eq("user_id", m.viewer.id).eq("source", source).eq("item_id", item)
    : ["saved", "dismissed"].includes(state)
      ? await q.upsert({ user_id: m.viewer.id, source, item_id: item, state })
      : { error: { message: "state" } };
  revalidatePath(RADAR);
  if (error) return fail("That couldn't be saved.");
  return ok(state === "saved" ? "Saved to your Opportunity Radar." : state === "dismissed" ? "Dismissed. You can bring it back under Dismissed." : "Restored.");
}

// ─── Application Center ─────────────────────────────────────────────────────────────────────────────────────────────────
export async function createApplication(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: sign in with your own account.");
  const title = str(f, "title", 200), kind = str(f, "kind", 20), deadline = str(f, "deadline", 10), url = str(f, "official_url", 1000);
  const opportunity = str(f, "opportunity_id", 40), finding = str(f, "finding_id", 40);
  if (title.length < 3) return fail("Name the opportunity you're applying for.");
  if (deadline && !isDate(deadline)) return fail("Enter the deadline as a date.");
  if (url && !httpsUrl(url)) return fail("The official link must begin with https://.");
  const { data, error } = await m.db.from("member_applications").insert({
    user_id: m.viewer.id, title, kind: kind in OPPORTUNITY_KINDS ? kind : "other", organization: str(f, "organization", 200) || null,
    deadline: deadline || null, official_url: url || null,
    opportunity_id: uuid(opportunity) ? opportunity : null, finding_id: uuid(finding) ? finding : null,
    checklist: parseChecklist(str(f, "checklist", 12000)),
  }).select("id").single();
  if (error || !data) return fail(friendly(error?.message, /Executive Private/.test(error?.message ?? "") ? "The Application Center is part of Executive Private and Elite Concierge." : /no longer open/.test(error?.message ?? "") ? "That opportunity is no longer open." : "The application couldn't be started."));
  revalidatePath(APPS); revalidatePath("/app/world");
  redirect(`${APPS}/${data.id}`);
}

export async function updateApplication(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: nothing is saved.");
  const id = str(f, "id", 40);
  if (!uuid(id)) return fail("Unknown application.");
  const status = str(f, "status", 20), deadline = str(f, "deadline", 10), url = str(f, "official_url", 1000), resume = str(f, "resume_id", 40);
  const submitted = str(f, "submitted_on", 10), title = str(f, "title", 200);
  if (!(status in APPLICATION_STATUS)) return fail("Choose a status.");
  if (title.length < 3) return fail("Give the application a name.");
  if ((deadline && !isDate(deadline)) || (submitted && !isDate(submitted))) return fail("Enter dates as dates.");
  if (url && !httpsUrl(url)) return fail("The official link must begin with https://.");
  const { error } = await m.db.from("member_applications").update({
    title, status, organization: str(f, "organization", 200) || null, deadline: deadline || null, submitted_on: submitted || null,
    official_url: url || null, resume_id: uuid(resume) ? resume : null, note: str(f, "note", 4000) || null,
  }).eq("id", id).eq("user_id", m.viewer.id);
  revalidatePath(`${APPS}/${id}`); revalidatePath(APPS);
  if (error) return fail(friendly(error.message, /approved/.test(error.message) ? "Link a résumé you have approved. You can approve one in My Professional Readiness." : "Your changes couldn't be saved."));
  return ok(`Saved. Status: ${APPLICATION_STATUS[status]}.`);
}

export async function saveChecklist(_p: R, f: FormData): Promise<R> {
  const m = await member(); if (!m) return fail("Preview only: nothing is saved.");
  const id = str(f, "id", 40);
  if (!uuid(id)) return fail("Unknown application.");
  const { data: a } = await m.db.from("member_applications").select("checklist").eq("id", id).eq("user_id", m.viewer.id).maybeSingle();
  if (!a) return fail("Unknown application.");
  const current = normalizeChecklist(a.checklist);
  // Ticks come from the checkboxes; the list itself from the text box (one item per line).
  const ticked = new Set(f.getAll("done").map(String));
  const kept = current.map((i, n) => ({ ...i, done: ticked.has(String(n)) }));
  const text = f.has("items") ? str(f, "items", 12000) : null;
  const checklist = text === null ? kept : parseChecklist(text, kept);
  const { error } = await m.db.from("member_applications").update({ checklist }).eq("id", id).eq("user_id", m.viewer.id);
  revalidatePath(`${APPS}/${id}`); revalidatePath(APPS);
  if (error) return fail("Your checklist couldn't be saved.");
  const done = checklist.filter((i) => i.done).length;
  return ok(checklist.length ? `Saved. ${done} of ${checklist.length} ready.` : "Saved. Your checklist is empty.");
}
