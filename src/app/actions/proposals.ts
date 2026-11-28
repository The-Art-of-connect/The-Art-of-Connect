"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { friendly, PURPOSES } from "@/lib/connect360";
import { normalizeSections, RESPONSES } from "@/lib/proposals";

/**
 * Strategic Business Proposal Builder (founder directive 28). Drafts are private to the author; a version becomes visible to others
 * only after the author authorizes it, and every proposal is a nonbinding discussion document. The database enforces each rule.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const PREVIEW = fail("Preview only: sign in with your own account to save.");

async function ctx(premium: boolean) {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  if (premium) {
    const m = await getMembership(viewer);
    if (!m || !atLeast(m.level, "executive")) return "premium" as const;
  }
  const db = await createClient();
  return db ? { viewer, b: db.schema("business") } : null;
}
const refresh = (id?: string) => { revalidatePath("/app/connect360/proposals"); if (id) revalidatePath(`/app/connect360/proposals/${id}`); };

export async function createProposal(_p: R, f: FormData): Promise<R> {
  const c = await ctx(true); if (!c) return PREVIEW; if (c === "premium") return fail("The Proposal Builder is part of Executive Private and Elite Concierge.");
  const title = str(f, "title", 200);
  if (title.length < 3) return fail("Give your proposal a title.");
  const room = str(f, "room", 40);
  const { data: p, error } = await c.b.from("proposals").insert({ author_id: c.viewer.id, title, room_id: z.string().uuid().safeParse(room).success ? room : null }).select("id").single();
  if (error || !p) return fail(friendly(error?.message, "The proposal couldn't be created."));
  const { error: e2 } = await c.b.from("proposal_versions").insert({ proposal_id: p.id, version: 1, author_id: c.viewer.id, sections: {} });
  if (e2) return fail(friendly(e2.message, "The first draft couldn't be created."));
  refresh(p.id);
  redirect(`/app/connect360/proposals/${p.id}`);
}

/** Saves the editor. Edits go to the current draft; once a version is authorized, saving starts a new draft version. */
export async function saveProposalDraft(id: string, title: string, raw: unknown, note: string): Promise<{ ok: boolean; message: string }> {
  const c = await ctx(true); if (!c) return { ok: false, message: "Preview only." }; if (c === "premium") return { ok: false, message: "Part of Executive Private and Elite Concierge." };
  const sections = normalizeSections(raw);
  const { data: latest } = await c.b.from("proposal_versions").select("id, version, status").eq("proposal_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest) return { ok: false, message: "Unknown proposal." };
  if (title.trim().length >= 3) await c.b.from("proposals").update({ title: title.trim().slice(0, 200) }).eq("id", id);
  const res = latest.status === "draft"
    ? await c.b.from("proposal_versions").update({ sections, change_note: note.slice(0, 2000) || null }).eq("id", latest.id)
    : await c.b.from("proposal_versions").insert({ proposal_id: id, version: latest.version + 1, author_id: c.viewer.id, sections, change_note: note.slice(0, 2000) || null });
  if (res.error) return { ok: false, message: friendly(res.error.message, "That couldn't be saved.") };
  refresh(id);
  return { ok: true, message: latest.status === "draft" ? "Draft saved." : `Saved as a new draft (version ${latest.version + 1}). The authorized version is unchanged.` };
}

export async function authorizeProposal(_p: R, f: FormData): Promise<R> {
  const c = await ctx(true); if (!c) return PREVIEW; if (c === "premium") return fail("Part of Executive Private and Elite Concierge.");
  if (f.get("confirm") !== "on") return fail("Please confirm you've reviewed the proposal and that factual statements are accurate.");
  const id = str(f, "id", 40);
  const { data: latest } = await c.b.from("proposal_versions").select("id, version, status, sections").eq("proposal_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest || latest.status !== "draft") return fail("There's no draft to authorize.");
  if (!Object.keys(normalizeSections(latest.sections)).length) return fail("Add some content before authorizing.");
  const { error } = await c.b.from("proposal_versions").update({ status: "authorized" }).eq("id", latest.id);
  if (error) return fail(friendly(error.message, "That couldn't be authorized."));
  refresh(id);
  return { ok: true, message: `Version ${latest.version} is authorized for sharing. It is preserved exactly as it is.` };
}

/** Shares the authorized version through the Business Collaboration Inbox. */
export async function sendProposal(_p: R, f: FormData): Promise<R> {
  const c = await ctx(true); if (!c) return PREVIEW; if (c === "premium") return fail("Part of Executive Private and Elite Concierge.");
  const id = str(f, "id", 40), recipient = str(f, "recipient", 40), purpose = str(f, "purpose", 40), reason = str(f, "reason", 2000);
  if (!z.string().uuid().safeParse(recipient).success || !(purpose in PURPOSES)) return fail("Choose a member and a purpose.");
  if (reason.length < 10) return fail("Explain why you're sharing this proposal with them (a sentence or two).");
  if (!(await allow("c360-proposal", 10, 86400))) return fail("You've reached today's limit for sharing proposals.");
  const { data: p } = await c.b.from("proposals").select("title, current_version").eq("id", id).maybeSingle();
  const { data: v } = await c.b.from("proposal_versions").select("version, summary").eq("proposal_id", id).eq("status", "authorized").order("version", { ascending: false }).limit(1).maybeSingle();
  if (!p || !v) return fail("Authorize a version before sharing it.");
  const { data: conv, error } = await c.b.from("conversations").insert({
    requester_id: c.viewer.id, recipient_id: recipient, kind: "proposal", purpose, project: `Proposal: ${p.title}`.slice(0, 3000), reason, proposal_id: id, proposal_version: v.version,
  }).select("id").single();
  if (error || !conv) return fail(error?.code === "23505" ? "This proposal is already open with that member." : friendly(error?.message, "The proposal couldn't be shared."));
  refresh(id);
  redirect(`/app/business/inbox/${conv.id}`);
}

export async function respondToProposal(_p: R, f: FormData): Promise<R> {
  const c = await ctx(false); if (!c || c === "premium") return PREVIEW;
  const kind = str(f, "kind", 40);
  if (!(kind in RESPONSES)) return fail("Choose a response.");
  const id = str(f, "id", 40);
  const { error } = await c.b.from("proposal_responses").insert({ proposal_id: id, version: Number(f.get("version")) || 1, responder_id: c.viewer.id, kind, note: str(f, "note", 4000) || null });
  if (error) return fail(friendly(error.message, "Your response couldn't be recorded."));
  refresh(id);
  return { ok: true, message: "Recorded. Responding is not an agreement or commitment of any kind." };
}
