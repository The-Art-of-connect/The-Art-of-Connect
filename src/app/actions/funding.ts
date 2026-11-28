"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { friendly } from "@/lib/connect360";
import { APP_STATUS, ASSESSMENT, COMM_KINDS, EVIDENCE_REQUIRED, PROJECT_KINDS, parseLines } from "@/lib/funding";

/**
 * Capital & Funding Intelligence Center (founder directive 29). Private to the member. The database enforces the rules:
 * declared and committed funds are self-reported; verified balances and approved financing need evidence and review;
 * approval needs a lender letter and "funded" needs the lender's disbursement confirmation; nothing is sent to lenders.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string): R => ({ ok: true, message });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const money = (v: string) => { const n = Number(v.replace(/[$,\s]/g, "")); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; };

async function ctx() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return fail("Preview only: sign in with your own account to save.");
  const m = await getMembership(viewer);
  if (!m || !atLeast(m.level, "executive")) return fail("The Capital & Funding Intelligence Center is part of Executive Private and Elite Concierge.");
  const db = await createClient();
  return db ? { viewer, b: db.schema("business") } : fail("Please try again in a moment.");
}
const page = (id: string) => { revalidatePath(`/app/connect360/funding/${id}`); revalidatePath("/app/connect360/funding"); };

export async function createFundingProject(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const title = str(f, "title", 160), kind = str(f, "kind", 40);
  if (title.length < 3 || !(kind in PROJECT_KINDS)) return fail("Add a name and choose what you're funding.");
  const { data, error } = await c.b.from("funding_projects").insert({ user_id: c.viewer.id, title, kind }).select("id").single();
  if (error || !data) return fail(friendly(error?.message, "The project couldn't be created."));
  page(data.id);
  redirect(`/app/connect360/funding/${data.id}`);
}

export async function saveAssessment(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const id = str(f, "id", 40);
  const assessment = Object.fromEntries(ASSESSMENT.map((q) => [q.key, { value: str(f, q.key, 1500), basis: "self_reported" }]).filter(([, v]) => (v as { value: string }).value));
  const missing = ASSESSMENT.filter((q) => q.key !== "credit" && !(q.key in assessment)).map((q) => q.label);
  const room = str(f, "room", 40);
  const { error } = await c.b.from("funding_projects").update({ assessment, missing, room_id: z.string().uuid().safeParse(room).success ? room : null, stage: missing.length ? "assessment" : "strategy" }).eq("id", id);
  if (error) return fail(friendly(error.message, "Your assessment couldn't be saved."));
  page(id);
  return ok(missing.length ? `Saved. ${missing.length} question${missing.length > 1 ? "s" : ""} still open before a full capital strategy.` : "Saved. Your assessment is complete; build your capital strategy next.");
}

export async function addScenario(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const id = str(f, "id", 40), name = str(f, "name", 120);
  const uses = parseLines(str(f, "uses", 4000)), sources = parseLines(str(f, "sources", 4000));
  if (name.length < 2 || !uses.length) return fail("Name the scenario and list at least one use of funds.");
  const { error } = await c.b.from("funding_scenarios").insert({ project_id: id, name, uses, sources, notes: str(f, "notes", 4000) || null });
  if (error) return fail(friendly(error.message, "The scenario couldn't be saved."));
  page(id);
  return ok("Scenario saved. Payment figures are estimates; actual terms come only from lenders.");
}

export async function addPosition(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const id = str(f, "id", 40), category = str(f, "category", 40);
  const amount = money(str(f, "amount", 30));
  if (!["declared", "committed", "verified_balance", "approved_financing"].includes(category) || amount === null || amount <= 0) return fail("Choose a type and enter an amount.");
  const method = category === "declared" ? "self_reported" : category === "committed" ? "member_attestation" : str(f, "method", 40);
  const doc = str(f, "document", 40);
  if (category === "committed" && f.get("attest") !== "on") return fail("Please confirm these funds are set aside for this project.");
  const { error } = await c.b.from("funding_positions").insert({ user_id: c.viewer.id, project_id: id, category, amount_cents: amount, method, document_id: z.string().uuid().safeParse(doc).success ? doc : null });
  if (error) return fail(friendly(error.message, category === "verified_balance" || category === "approved_financing" ? "Attach the lender or professional letter (uploaded to a Business Deal Room you're in) for review." : "That couldn't be recorded."));
  page(id);
  return ok(category === "declared" || category === "committed" ? "Recorded as self-reported." : "Submitted for review. It will show as verified only after the owner reviews the evidence.");
}

export async function withdrawPosition(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const { error } = await c.b.from("funding_positions").update({ status: "withdrawn" }).eq("id", str(f, "position", 40));
  if (error) return fail("That couldn't be withdrawn.");
  page(str(f, "id", 40));
  return ok("Withdrawn.");
}

export async function saveApplication(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const id = str(f, "id", 40), app = str(f, "application", 40), status = str(f, "status", 40);
  if (!(status in APP_STATUS)) return fail("Choose a status.");
  const doc = str(f, "evidence", 40);
  const evidence = z.string().uuid().safeParse(doc).success ? doc : null;
  if (status in EVIDENCE_REQUIRED && !evidence) return fail(`Attach ${EVIDENCE_REQUIRED[status]} first.`);
  const row = { status, evidence_document_id: evidence, decision_note: str(f, "note", 2000) || null };
  const res = app
    ? await c.b.from("funding_applications").update(row).eq("id", app)
    : await c.b.from("funding_applications").insert({
        ...row, project_id: id, user_id: c.viewer.id, provider_name: str(f, "provider", 200), product: str(f, "product", 200) || null,
        provider_url: /^https:\/\//.test(str(f, "url", 1000)) ? str(f, "url", 1000) : null, amount_requested_cents: money(str(f, "amount", 30)),
      });
  if (res.error) return fail(friendly(res.error.message, res.error.message.includes("funded only") ? "Financing is marked funded only with the lender's disbursement confirmation. An approval letter alone is not enough." : res.error.message.includes("approval or commitment") ? "Attach the lender's approval or commitment letter before marking financing as approved." : "That couldn't be saved."));
  page(id);
  return ok("Saved. Lender decisions are recorded only by you, with the lender's own documents.");
}

export async function saveCommunication(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const id = str(f, "id", 40), kind = str(f, "kind", 40);
  if (!(kind in COMM_KINDS)) return fail("Choose a type.");
  const body = str(f, "body", 8000), subject = str(f, "subject", 200), recipient = str(f, "recipient", 200);
  if (recipient.length < 2 || subject.length < 2 || body.length < 10) return fail("Add the lender, a subject and your message.");
  const { error } = await c.b.from("funding_communications").insert({ project_id: id, user_id: c.viewer.id, kind, recipient, subject, body });
  if (error) return fail(friendly(error.message, "That couldn't be saved."));
  page(id);
  return ok("Draft saved. Review it, then copy it into your own email when you're ready. Nothing is sent automatically.");
}

export async function setCommunicationStatus(_p: R, f: FormData): Promise<R> {
  const c = await ctx(); if (!c || !("b" in c)) return c;
  const status = str(f, "status", 30);
  if (!["authorized", "sent_by_member", "archived"].includes(status)) return fail("Invalid status.");
  const { error } = await c.b.from("funding_communications").update({ status, authorized_at: status === "authorized" ? new Date().toISOString() : undefined }).eq("id", str(f, "comm", 40));
  if (error) return fail("That couldn't be updated.");
  page(str(f, "id", 40));
  return ok(status === "sent_by_member" ? "Marked as sent by you." : "Updated.");
}
