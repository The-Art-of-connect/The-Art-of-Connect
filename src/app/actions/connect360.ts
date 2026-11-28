"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { ADVISOR_TYPES, DOC_CATEGORIES, INTERESTS, ITEM_KINDS, PURPOSES, STAGES, friendly } from "@/lib/connect360";

/**
 * CONNECT 360 member actions (founder directives 27–29): collaboration preferences and requests, Business Deal Rooms, advisors, plan items,
 * private and shared discussion, documents and reviews. Every rule is enforced again by the database (row-level security and
 * guards); these checks add respectful messages.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const uuid = (v: string) => z.string().uuid().safeParse(v).success;
const PREVIEW = fail("Preview only: sign in with your own account to save.");

type Ctx = { viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>; db: NonNullable<Awaited<ReturnType<typeof createClient>>>; b: ReturnType<NonNullable<Awaited<ReturnType<typeof createClient>>>["schema"]> };
const isCtx = (m: Ctx | R): m is Ctx => Boolean(m && "b" in m);
/** The signed-in member (not a preview), optionally required to hold Executive Private or Elite Concierge. */
async function me(premium = true): Promise<Ctx | R> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return PREVIEW;
  if (premium) {
    const m = await getMembership(viewer);
    if (!m || !atLeast(m.level, "executive")) return fail("This is part of Executive Private and Elite Concierge.");
  }
  const db = await createClient();
  return db ? { viewer, db, b: db.schema("business") } : fail("Please try again in a moment.");
}
const room = (id: string) => { revalidatePath(`/app/connect360/rooms/${id}`); revalidatePath("/app/connect360/rooms"); };

// ─── Collaboration preferences and requests (directive 27 §3–4) ────────────────────────────────
export async function saveCollabProfile(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!isCtx(m)) return m;
  const interests = f.getAll("interests").map(String).filter((k) => k in INTERESTS);
  const regions = str(f, "regions", 600).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const row = {
    user_id: m.viewer.id, collab_opt_in: f.get("opt_in") === "on", collab_welcome_requests: f.get("welcome") === "on", collab_interests: interests,
    collab_regions: regions, collab_owns_business: f.get("owns") === "yes" ? true : f.get("owns") === "no" ? false : null, collab_summary: str(f, "summary", 1500) || null,
  };
  const { error } = await m.b.from("profiles").upsert(row, { onConflict: "user_id" });
  if (error) return fail(friendly(error.message, "Your preferences couldn't be saved."));
  revalidatePath("/app/connect360/collaborate");
  return ok(row.collab_opt_in ? "Saved. Executive and Elite members can now find your collaboration interests." : "Saved. You're not listed in the collaboration directory.");
}

export async function requestCollaboration(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!isCtx(m)) return m;
  const recipient = str(f, "recipient", 40);
  const purpose = str(f, "purpose", 40);
  if (!uuid(recipient) || !(purpose in PURPOSES)) return fail("Choose a member and a purpose.");
  const project = str(f, "project", 3000), reason = str(f, "reason", 2000), shared = str(f, "shared", 3000);
  if (project.length < 10 || reason.length < 10) return fail("Describe the project and why you're reaching out (a sentence or two each).");
  if (!(await allow("c360-request", 10, 86400))) return fail("You've reached today's limit for collaboration requests.");
  const { data, error } = await m.b.from("conversations").insert({ requester_id: m.viewer.id, recipient_id: recipient, kind: "collaboration", purpose, project, reason, shared_info: shared || null }).select("id").single();
  if (error || !data) return fail(error?.code === "23505" ? "You already have an open request with this member. Check your inbox." : friendly(error?.message, "This member isn't accepting requests right now."));
  revalidatePath("/app/business/inbox");
  redirect(`/app/business/inbox/${data.id}`);
}

/** Recipient decisions on a collaboration request; accepting is an invitation to discuss, never an agreement. */
export async function respondCollaboration(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40);
  const decision = str(f, "decision", 20);
  if (!["accepted", "declined", "more_info", "withdrawn"].includes(decision)) return fail("Invalid choice.");
  const { error } = await m.b.from("conversations").update({ status: decision }).eq("id", id);
  if (error) return fail(friendly(error.message, "That couldn't be updated."));
  revalidatePath(`/app/business/inbox/${id}`); revalidatePath("/app/business/inbox");
  return ok({ accepted: "Accepted for discussion. This isn't an agreement or commitment of any kind.", declined: "Declined.", more_info: "Asked for more information. You can each send a few messages before deciding.", withdrawn: "Withdrawn from the discussion." }[decision]!);
}

// ─── Business Deal Rooms (directives 27 §6, 28 §10) ───────────────────────────────────────────────────
export async function createRoom(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!isCtx(m)) return m;
  const title = str(f, "title", 160);
  if (title.length < 3) return fail("Give your Business Deal Room a name.");
  const { data, error } = await m.b.from("deal_rooms").insert({ owner_id: m.viewer.id, title, objective: str(f, "objective", 4000) || null }).select("id").single();
  if (error || !data) return fail(friendly(error?.message, "The Business Deal Room couldn't be created."));
  room(data.id);
  redirect(`/app/connect360/rooms/${data.id}`);
}

export async function updateRoom(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40);
  const stage = str(f, "stage", 40);
  const patch: Record<string, unknown> = { objective: str(f, "objective", 4000) || null };
  if (stage in STAGES) patch.stage = stage;
  if (f.get("archive") === "1") patch.status = "archived";
  const { error } = await m.b.from("deal_rooms").update(patch).eq("id", id);
  if (error) return fail(friendly(error.message, "Only the Business Deal Room owner can change this."));
  room(id);
  return ok("Saved.");
}

export async function invitePrincipal(_p: R, f: FormData): Promise<R> {
  const m = await me(); if (!isCtx(m)) return m;
  const id = str(f, "id", 40), user = str(f, "user", 40);
  if (!uuid(user)) return fail("Choose a collaborator.");
  const { error } = await m.b.from("room_participants").insert({ room_id: id, user_id: user, role: "principal" });
  if (error) return fail(error.code === "23505" ? "They're already invited." : friendly(error.message, "That invitation couldn't be sent."));
  room(id);
  return ok("Invited. They'll see the Business Deal Room and can accept or decline.");
}

/** A participant accepts or declines their invitation, or withdraws (their advisors and shared funding information leave with them). */
export async function setMyParticipation(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40), status = str(f, "status", 20);
  if (!["active", "declined", "withdrawn"].includes(status)) return fail("Invalid choice.");
  const { error } = await m.b.from("room_participants").update({ status }).eq("room_id", id).eq("user_id", m.viewer.id);
  if (error) return fail(friendly(error.message, "That couldn't be updated."));
  room(id);
  if (status !== "active") redirect("/app/connect360/rooms");
  return ok("Welcome to the Business Deal Room.");
}

export async function removeParticipant(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "room", 40);
  const { error } = await m.b.from("room_participants").update({ status: "removed" }).eq("id", str(f, "participant", 40));
  if (error) return fail(friendly(error.message, "You can remove only your own advisors, or anyone if you own the Business Deal Room."));
  room(id);
  return ok("Removed.");
}

/** A one-time invitation link for the member's own professional advisor. Only its hash is stored; the link is shown once. */
export async function inviteAdvisor(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40);
  const type = str(f, "type", 40), name = str(f, "name", 160), email = str(f, "email", 254).toLowerCase(), firm = str(f, "firm", 200);
  if (!(type in ADVISOR_TYPES) || name.length < 2 || !z.string().email().safeParse(email).success) return fail("Add the advisor's role, name and professional email.");
  if (!(await allow("c360-advisor", 20, 86400))) return fail("You've reached today's limit for advisor invitations.");
  const token = randomBytes(32).toString("base64url");
  const { error } = await m.b.from("advisor_invites").insert({ room_id: id, client_id: m.viewer.id, advisor_type: type, advisor_name: name, advisor_email: email, firm: firm || null, token_hash: createHash("sha256").update(token).digest("hex") });
  if (error) return fail(friendly(error.message, "That invitation couldn't be created."));
  room(id);
  return { ok: true, message: `Invitation created for ${name}. Copy this private link and send it to them yourself; it works once and expires in 14 days: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/app/connect360/advisor/${token}` };
}

export async function revokeAdvisorInvite(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const { error } = await m.b.from("advisor_invites").update({ status: "revoked" }).eq("id", str(f, "invite", 40));
  if (error) return fail("That invitation couldn't be revoked.");
  room(str(f, "room", 40));
  return ok("Invitation revoked.");
}

/** The advisor accepts with any account (a membership isn't required to review a client's project). */
export async function acceptAdvisorInvite(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const { data, error } = await m.b.rpc("accept_advisor_invite", { token: str(f, "token", 200) });
  if (error || !data) return fail(friendly(error?.message, "This invitation is no longer valid."));
  room(String(data));
  redirect(`/app/connect360/rooms/${data}`);
}

// ─── Plan items, discussion, documents and reviews ──────────────────────────────────────────
export async function addItem(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40), kind = str(f, "kind", 40), title = str(f, "title", 200);
  if (!(kind in ITEM_KINDS) || title.length < 2) return fail("Choose a type and add a title.");
  const space = f.get("space") === "private" ? "private" : "shared";
  const due = str(f, "due", 20);
  const { error } = await m.b.from("room_items").insert({
    room_id: id, kind, title, detail: str(f, "detail", 4000) || null, created_by: m.viewer.id, space, space_owner: space === "private" ? str(f, "space_owner", 40) : null,
    due_at: /^\d{4}-\d{2}-\d{2}$/.test(due) ? `${due}T17:00:00Z` : null,
  });
  if (error) return fail(friendly(error.message, "That couldn't be added."));
  room(id);
  return ok("Added.");
}

export async function setItemStatus(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const status = str(f, "status", 20);
  if (!["open", "in_progress", "done", "resolved", "not_applicable"].includes(status)) return fail("Invalid status.");
  const { error } = await m.b.from("room_items").update({ status }).eq("id", str(f, "item", 40));
  if (error) return fail("That couldn't be updated.");
  room(str(f, "id", 40));
  return ok("Updated.");
}

export async function postRoomMessage(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40), body = str(f, "body", 4000);
  if (!body) return fail("Write a message.");
  if (!(await allow("c360-room-msg", 60, 3600))) return fail("You're sending messages too quickly. Please wait a moment.");
  const space = f.get("space") === "private" ? "private" : "shared";
  const { error } = await m.b.from("room_messages").insert({ room_id: id, sender_id: m.viewer.id, body, space, space_owner: space === "private" ? str(f, "space_owner", 40) : null });
  if (error) return fail(friendly(error.message, "Message not sent."));
  room(id);
  return ok("Sent.");
}

/** Creates the document record; the file itself is uploaded by the browser directly to the vault (testing storage). */
export async function createDocument(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const id = str(f, "id", 40), category = str(f, "category", 60), title = str(f, "title", 200);
  if (!(category in DOC_CATEGORIES) || title.length < 2) return fail("Choose a category and add a title.");
  const space = f.get("space") === "private" ? "private" : "shared";
  const privileged = f.get("privileged") === "on";
  if (privileged && space !== "private") return fail("Privileged material can only be placed in your private advisor space.");
  const { data, error } = await m.b.from("room_documents").insert({ room_id: id, uploaded_by: m.viewer.id, category, title, space, space_owner: space === "private" ? str(f, "space_owner", 40) : null, privileged }).select("id").single();
  if (error || !data) return fail(friendly(error?.message, "That document couldn't be created."));
  room(id);
  return ok("Document added. Now attach the file.");
}

export async function recordReview(_p: R, f: FormData): Promise<R> {
  const m = await me(false); if (!isCtx(m)) return m;
  const kind = str(f, "kind", 40);
  if (!["review_requested", "comment", "information_requested", "revision_proposed", "reviewed", "revision_required", "addressed", "final_authorized"].includes(kind)) return fail("Invalid review.");
  const { error } = await m.b.from("document_reviews").insert({ document_id: str(f, "document", 40), version: Number(f.get("version")) || 1, author_id: m.viewer.id, kind, note: str(f, "note", 6000) || null });
  if (error) return fail(friendly(error.message, "That couldn't be recorded."));
  room(str(f, "id", 40));
  return ok("Recorded.");
}
