"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMfaStatus, getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import type { ActionResult } from "@/app/actions/admin";
import { EVENT_CATEGORIES, INTERESTS, REPORT_REASONS, SEEKING, TIMEZONES, cleanList } from "@/lib/social";

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const s = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const UUID = /^[0-9a-f-]{36}$/;

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const SIGN_IN = fail("Please sign in with your own account (not a preview).");

/** Re-encodes an image to strip location and camera metadata, and limits its size. */
async function cleanImage(file: File): Promise<{ data: Buffer; ext: string; type: string } | string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Please choose a JPEG, PNG or WebP photograph.";
  if (file.size > 10 * 1024 * 1024) return "Please choose a photograph under 10 MB.";
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return { data, ext: "webp", type: "image/webp" };
  } catch {
    return "That photograph couldn't be processed. Please try another.";
  }
}
async function uploadImage(m: NonNullable<Awaited<ReturnType<typeof member>>>, file: File) {
  const img = await cleanImage(file);
  if (typeof img === "string") return { error: img } as const;
  const path = `u/${m.viewer.id}/${randomUUID()}.${img.ext}`;
  const { error } = await m.db.storage.from("member-photos").upload(path, img.data, { contentType: img.type, upsert: false });
  return error ? ({ error: "The photograph couldn't be uploaded. Please try again." } as const) : ({ path } as const);
}
const fileFrom = (f: FormData, k: string) => { const v = f.get(k); return v instanceof File && v.size > 0 ? v : null; };

// ─── Profile and photographs ──────────────────────────────────────
export async function saveSocialProfile(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const row = {
    user_id: m.viewer.id, headline: s(f, "headline", 120) || null, bio: s(f, "bio", 1000) || null,
    city: s(f, "city", 80) || null, region: s(f, "region", 80) || null, country: s(f, "country", 80) || null,
    show_location: f.get("show_location") === "on",
    interests: cleanList(f.getAll("interests"), INTERESTS, 20), seeking: cleanList(f.getAll("seeking"), SEEKING, 7),
    discoverable: f.get("discoverable") === "on", updated_at: new Date().toISOString(),
  };
  const { error } = await m.db.from("social_profiles").upsert(row);
  if (error) return fail("Not saved. Please try again.");
  revalidatePath("/app/connect", "layout");
  return ok("Your profile is saved.");
}

export async function uploadSocialPhoto(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const file = fileFrom(f, "photo"); if (!file) return fail("Choose a photograph.");
  if (!(await allow(`photo:${m.viewer.id}`, 30, 3600))) return fail("Please wait a little before adding more photographs.");
  const up = await uploadImage(m, file); if ("error" in up) return fail(up.error!);
  const visibility = ["members", "connections", "private"].includes(s(f, "visibility")) ? s(f, "visibility") : "members";
  const { error } = await m.db.from("social_photos").insert({ user_id: m.viewer.id, path: up.path, caption: s(f, "caption", 300) || null, visibility });
  if (error) {
    await m.db.storage.from("member-photos").remove([up.path]);
    return fail(error.message.includes("limit") ? "You've reached your photograph limit for your membership." : "Not saved. Please try again.");
  }
  if (f.get("avatar") === "on") await m.db.from("social_profiles").upsert({ user_id: m.viewer.id, avatar_path: up.path });
  revalidatePath("/app/connect/profile");
  return ok("Photograph added.");
}

export async function updateSocialPhoto(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "id", 40); if (!UUID.test(id)) return fail("Not found.");
  const { data: ph } = await m.db.from("social_photos").select("path").eq("id", id).eq("user_id", m.viewer.id).maybeSingle();
  if (!ph) return fail("Not found.");
  const op = s(f, "op");
  if (op === "delete") {
    await m.db.from("social_photos").delete().eq("id", id);
    await m.db.storage.from("member-photos").remove([ph.path]);
    await m.db.from("social_profiles").update({ avatar_path: null }).eq("user_id", m.viewer.id).eq("avatar_path", ph.path);
  } else if (op === "avatar") {
    await m.db.from("social_profiles").upsert({ user_id: m.viewer.id, avatar_path: ph.path });
  } else {
    const visibility = ["members", "connections", "private"].includes(s(f, "visibility")) ? s(f, "visibility") : "members";
    await m.db.from("social_photos").update({ visibility }).eq("id", id);
  }
  revalidatePath("/app/connect/profile");
  return ok("Saved.");
}

// ─── Connection Feed ──────────────────────────────────────────────
export async function createPost(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  if (!(await allow(`post:${m.viewer.id}`, 30, 3600))) return fail("Please wait a little before posting again.");
  const body = s(f, "body", 4000) || null;
  const file = fileFrom(f, "photo");
  if (!body && !file) return fail("Share a few words or a photograph.");
  const audienceRaw = s(f, "audience", 60);
  const circle = audienceRaw.startsWith("circle:") ? audienceRaw.slice(7) : null;
  const audience = circle ? "circle" : audienceRaw === "connections" ? "connections" : "members";
  if (circle && !UUID.test(circle)) return fail("Choose who can see this.");
  let photo_path: string | null = null;
  if (file) { const up = await uploadImage(m, file); if ("error" in up) return fail(up.error!); photo_path = up.path; }
  const kind = ["thought", "accomplishment", "life_update", "education", "recommendation"].includes(s(f, "kind")) ? s(f, "kind") : photo_path ? "photo" : "thought";
  const { error } = await m.db.from("social_posts").insert({ author_id: m.viewer.id, body, photo_path, audience, circle_id: circle, kind });
  if (error) { if (photo_path) await m.db.storage.from("member-photos").remove([photo_path]); return fail("Not shared. Please try again."); }
  revalidatePath("/app/connect", "layout");
  return ok("Shared.");
}

export async function postAction(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "id", 40); if (!UUID.test(id)) return fail("Not found.");
  const op = s(f, "op");
  if (op === "appreciate") {
    const { error } = await m.db.from("social_reactions").insert({ post_id: id, user_id: m.viewer.id });
    if (error) await m.db.from("social_reactions").delete().eq("post_id", id).eq("user_id", m.viewer.id);
  } else if (op === "save") {
    const { error } = await m.db.from("social_saves").insert({ post_id: id, user_id: m.viewer.id });
    if (error) await m.db.from("social_saves").delete().eq("post_id", id).eq("user_id", m.viewer.id);
  } else if (op === "delete") {
    const { data } = await m.db.from("social_posts").select("photo_path").eq("id", id).eq("author_id", m.viewer.id).maybeSingle();
    await m.db.from("social_posts").delete().eq("id", id).eq("author_id", m.viewer.id);
    if (data?.photo_path) await m.db.storage.from("member-photos").remove([data.photo_path]);
  }
  revalidatePath("/app/connect", "layout");
  return ok(op === "delete" ? "Removed." : "Saved.");
}

export async function addComment(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const body = s(f, "body", 2000); if (!body) return fail("Write a comment first.");
  const post = s(f, "post_id", 40), event = s(f, "event_id", 40);
  if (!(await allow(`comment:${m.viewer.id}`, 60, 3600))) return fail("Please slow down a little.");
  const row = UUID.test(post) ? { post_id: post } : UUID.test(event) ? { event_id: event } : null;
  if (!row) return fail("Not found.");
  const { error } = await m.db.from("social_comments").insert({ ...row, author_id: m.viewer.id, body });
  if (error) return fail("Not posted.");
  revalidatePath("/app/connect", "layout");
  return ok("Posted.");
}

export async function reportContent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const type = s(f, "type", 20), id = s(f, "id", 40), reason = s(f, "reason", 20);
  if (!["post", "comment", "event", "circle", "member", "message", "photo"].includes(type) || !UUID.test(id)) return fail("Not found.");
  if (!REPORT_REASONS.some(([k]) => k === reason)) return fail("Choose a reason.");
  if (!(await allow(`report:${m.viewer.id}`, 20, 3600))) return fail("Thank you. Please wait before sending more reports.");
  const { error } = await m.db.from("social_reports").insert({ reporter_id: m.viewer.id, target_type: type, target_id: id, reason, details: s(f, "details", 2000) || null });
  return error ? fail("Not sent.") : ok("Thank you. Our team will review this privately.");
}

// ─── Connections, follows, blocks ─────────────────────────────────
export async function connectionAction(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const other = s(f, "user_id", 40); if (!UUID.test(other) || other === m.viewer.id) return fail("Not found.");
  const op = s(f, "op");
  if (op === "request") {
    const intention = s(f, "intention", 30);
    if (!SEEKING.some(([k]) => k === intention)) return fail("Choose what kind of connection you'd like.");
    if (!(await allow(`connect:${m.viewer.id}`, 40, 86400))) return fail("You've sent many requests today. Please try again tomorrow.");
    const { error } = await m.db.from("social_connections").insert({ requester_id: m.viewer.id, addressee_id: other, intention, note: s(f, "note", 300) || null });
    if (error) return fail("A request already exists, or this member isn't available.");
  } else if (op === "accept" || op === "decline") {
    await m.db.from("social_connections").update({ status: op === "accept" ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("requester_id", other).eq("addressee_id", m.viewer.id);
  } else if (op === "remove") {
    await m.db.from("social_connections").delete().or(`and(requester_id.eq.${m.viewer.id},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${m.viewer.id})`);
  } else if (op === "follow") {
    const { error } = await m.db.from("social_follows").insert({ follower_id: m.viewer.id, followee_id: other });
    if (error) await m.db.from("social_follows").delete().eq("follower_id", m.viewer.id).eq("followee_id", other);
  } else if (op === "block") {
    await m.db.from("blocks").insert({ blocker_id: m.viewer.id, blocked_id: other });
    await m.db.from("social_connections").delete().or(`and(requester_id.eq.${m.viewer.id},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${m.viewer.id})`);
    await m.db.from("social_follows").delete().eq("follower_id", m.viewer.id).eq("followee_id", other);
  } else return fail("Choose an action.");
  revalidatePath("/app/connect", "layout");
  return ok(op === "request" ? "Request sent. They'll decide privately." : op === "accept" ? "You're now connected." : op === "block" ? "Blocked. They can no longer see or contact you here." : "Saved.");
}

// ─── Circles ──────────────────────────────────────────────────────
export async function circleAction(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "circle_id", 40); if (!UUID.test(id)) return fail("Not found.");
  const op = s(f, "op");
  if (op === "join") {
    const { error } = await m.db.from("social_circle_members").insert({ circle_id: id, user_id: m.viewer.id });
    if (error) return fail(error.code === "23505" ? "You're already a member." : "This circle has membership requirements you don't meet yet.");
  } else if (op === "leave") {
    await m.db.from("social_circle_members").delete().eq("circle_id", id).eq("user_id", m.viewer.id);
  } else if (op === "notify") {
    await m.db.from("social_circle_members").update({ notify: f.get("notify") === "on" }).eq("circle_id", id).eq("user_id", m.viewer.id);
  }
  revalidatePath("/app/connect", "layout");
  return ok(op === "join" ? "Welcome to the circle." : op === "leave" ? "You've left the circle." : "Saved.");
}

export async function proposeCircle(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const name = s(f, "name", 80);
  if (name.length < 3) return fail("Give your circle a name.");
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}-${randomUUID().slice(0, 6)}`;
  const category = ["business", "life", "wellness", "culture", "local"].includes(s(f, "category")) ? s(f, "category") : "life";
  const { error } = await m.db.from("social_circles").insert({
    slug, name, tagline: s(f, "tagline", 160) || null, description: s(f, "description", 2000) || null, category,
    interests: cleanList(f.getAll("interests"), INTERESTS, 6), status: "proposed", created_by: m.viewer.id,
  });
  if (error) return fail("Not sent. Please try again.");
  return ok("Thank you. Your circle is with our founder for approval; you'll host it once approved.");
}

// ─── The Connect Calendar ─────────────────────────────────────────
export async function createEvent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  if (!(await allow(`event:${m.viewer.id}`, 15, 86400))) return fail("You've shared many events today. Please try again tomorrow.");
  const title = s(f, "title", 140); if (title.length < 3) return fail("Add the event name.");
  const category = s(f, "category"); if (!EVENT_CATEGORIES.some(([k]) => k === category)) return fail("Choose a category.");
  const tz = TIMEZONES.includes(s(f, "timezone") as never) ? s(f, "timezone") : "America/New_York";
  const startsLocal = s(f, "starts_at", 30); if (!startsLocal) return fail("Add the date and time.");
  const toUtc = (local: string) => {
    // Interpret the entered wall-clock time in the event's time zone.
    const guess = new Date(`${local}:00Z`);
    const inTz = new Date(guess.toLocaleString("en-US", { timeZone: tz }));
    return new Date(guess.getTime() + (guess.getTime() - inTz.getTime()));
  };
  const starts = toUtc(startsLocal); if (Number.isNaN(starts.getTime())) return fail("Check the date and time.");
  const endsLocal = s(f, "ends_at", 30); const ends = endsLocal ? toUtc(endsLocal) : null;
  if (ends && ends <= starts) return fail("The end must be after the start.");
  const url = s(f, "url", 500); if (url && !/^https:\/\/\S{3,}$/.test(url)) return fail("The event link must start with https://");
  const origin = f.get("origin") === "member_organized" ? "member_organized" : "shared_external";
  const organizer = s(f, "organizer_name", 120); if (origin === "shared_external" && !organizer) return fail("Who organizes it? Please name the organizer.");
  const audienceRaw = s(f, "audience", 60);
  const circle = audienceRaw.startsWith("circle:") ? audienceRaw.slice(7) : null;
  const eligibility = ["all", "couples", "singles", "elite"].includes(s(f, "eligibility")) ? s(f, "eligibility") : "all";
  let photo_path: string | null = null;
  const file = fileFrom(f, "photo");
  if (file) { const up = await uploadImage(m, file); if ("error" in up) return fail(up.error!); photo_path = up.path; }
  const isFree = f.get("is_free") === "on";
  const { data, error } = await m.db.from("social_events").insert({
    created_by: m.viewer.id, origin, title, description: s(f, "description", 4000) || null, category,
    starts_at: starts.toISOString(), ends_at: ends?.toISOString() ?? null, timezone: tz,
    mode: ["in_person", "virtual", "hybrid"].includes(s(f, "mode")) ? s(f, "mode") : "in_person",
    venue: s(f, "venue", 200) || null, city: s(f, "city", 80) || null, region: s(f, "region", 80) || null, country: s(f, "country", 80) || null,
    is_free: isFree, cost_text: isFree ? null : s(f, "cost_text", 80) || null, url: url || null,
    organizer_name: organizer || m.viewer.displayName || null, eligibility,
    audience: circle ? "circle" : audienceRaw === "connections" ? "connections" : "members", circle_id: circle && UUID.test(circle) ? circle : null, photo_path,
  }).select("id").single();
  if (error || !data) { if (photo_path) await m.db.storage.from("member-photos").remove([photo_path]); return fail("Not shared. Please check the details."); }
  if (f.get("to_feed") === "on") await m.db.from("social_posts").insert({ author_id: m.viewer.id, kind: "event", event_id: data.id, body: null, audience: circle ? "circle" : "members", circle_id: circle && UUID.test(circle) ? circle : null });
  revalidatePath("/app/connect", "layout");
  redirect(`/app/connect/events/${data.id}`);
}

export async function rsvpEvent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "event_id", 40); if (!UUID.test(id)) return fail("Not found.");
  const status = s(f, "status");
  if (status === "none") { await m.db.from("social_event_rsvps").delete().eq("event_id", id).eq("user_id", m.viewer.id); }
  else {
    if (!["interested", "attending", "info_requested"].includes(status)) return fail("Choose an option.");
    const { error } = await m.db.from("social_event_rsvps").upsert({
      event_id: id, user_id: m.viewer.id, status, attend_with: f.get("attend_with") === "on",
      share_attendance: f.get("share_attendance") === "on", remind: f.get("remind") === "on", updated_at: new Date().toISOString(),
    });
    if (error) return fail("Not saved.");
  }
  revalidatePath(`/app/connect/events/${id}`);
  return ok(status === "info_requested" ? "Noted. Ask your question in the discussion below; the person who shared it will see it." : "Saved.");
}

export async function eventOwnerAction(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "event_id", 40); if (!UUID.test(id)) return fail("Not found.");
  const { error } = await m.db.from("social_events").update({ status: "canceled" }).eq("id", id).eq("created_by", m.viewer.id);
  if (error) return fail("Not saved.");
  revalidatePath(`/app/connect/events/${id}`);
  return ok("The event is marked canceled.");
}

/** Adds an event to the member's shared couples calendar (both partners see it there, privately). */
export async function addEventToCouplesCalendar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "event_id", 40); if (!UUID.test(id)) return fail("Not found.");
  const { data: e } = await m.db.from("social_events").select("title, starts_at, ends_at, venue, city").eq("id", id).maybeSingle();
  if (!e) return fail("Not found.");
  const { data: cm } = await m.db.schema("relationships").from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  if (!cm) return fail("Link your partner first to use a shared couples calendar.");
  const start = new Date(e.starts_at); const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 2 * 3600_000);
  const { error } = await m.db.schema("relationships").from("couple_events").insert({
    couple_id: cm.couple_id, created_by: m.viewer.id, kind: "activity", title: e.title.slice(0, 120),
    location: [e.venue, e.city].filter(Boolean).join(", ").slice(0, 200) || null, notes: "From The Connect Calendar", starts_at: start.toISOString(), ends_at: end.toISOString(),
  });
  return error ? fail("Not added.") : ok("Added to your couples calendar.");
}

// ─── Conversations ────────────────────────────────────────────────
export async function startConversation(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const ids = f.getAll("members").map(String).filter((x) => UUID.test(x));
  const event = s(f, "event_id", 40);
  const { data, error } = await m.db.rpc("social_start_conversation", { p_members: ids, p_title: s(f, "title", 120) || null, p_event: UUID.test(event) ? event : null });
  if (error || !data) return fail(error?.message.includes("connections") ? "You can message your connections only." : "Choose who to include.");
  redirect(`/app/connect/messages/${data}`);
}

export async function sendMessage(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const id = s(f, "conversation_id", 40); const body = s(f, "body", 4000);
  if (!UUID.test(id) || !body) return fail("Write a message first.");
  if (!(await allow(`msg:${m.viewer.id}`, 120, 3600))) return fail("Please slow down a little.");
  const { error } = await m.db.from("social_messages").insert({ conversation_id: id, sender_id: m.viewer.id, body });
  if (error) return fail("Not sent.");
  await m.db.from("social_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", m.viewer.id);
  revalidatePath(`/app/connect/messages/${id}`);
  return ok("Sent.");
}

// ─── Owner and moderators ─────────────────────────────────────────
async function staff() {
  const viewer = await getViewer();
  if (!viewer || viewer.viewAs || !hasRole(viewer, ["owner", "admin", "moderator"])) return null;
  if (hasRole(viewer, ["owner"]) && !(await getMfaStatus()).verified) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

export async function resolveSocialReport(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st) return fail("Only the owner and moderators can do this.");
  const id = s(f, "id", 40); const decision = s(f, "decision");
  const { data: r } = await st.db.from("social_reports").select("target_type, target_id").eq("id", id).maybeSingle();
  if (!r) return fail("Not found.");
  if (decision === "remove") {
    const table = ({ post: "social_posts", comment: "social_comments", event: "social_events", photo: "social_photos" } as Record<string, string>)[r.target_type];
    if (table) await st.db.from(table).update({ status: "removed" }).eq("id", r.target_id);
    if (r.target_type === "circle") await st.db.from("social_circles").update({ status: "archived" }).eq("id", r.target_id);
  }
  await st.db.from("social_reports").update({ status: decision === "dismiss" ? "dismissed" : "actioned", resolved_by: st.viewer.id, resolved_at: new Date().toISOString() }).eq("id", id);
  await audit(`social.report_${decision}`, "social_reports", id, { target: r.target_type });
  revalidatePath("/admin/social");
  return ok(decision === "remove" ? "Removed and resolved." : "Resolved.");
}

export async function decideCircle(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st || !hasRole(st.viewer, ["owner"])) return fail("Only the owner can approve circles.");
  const id = s(f, "id", 40);
  const { error } = await st.db.rpc("social_approve_circle", { p_circle: id, p_approve: f.get("approve") === "yes" });
  if (error) return fail("Not saved.");
  await audit("social.circle_decision", "social_circles", id, { approve: f.get("approve") === "yes" });
  revalidatePath("/admin/social");
  return ok("Saved.");
}

export async function archiveCircle(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st || !hasRole(st.viewer, ["owner"])) return fail("Only the owner can do this.");
  const id = s(f, "id", 40);
  await st.db.from("social_circles").update({ status: f.get("restore") === "yes" ? "active" : "archived" }).eq("id", id);
  await audit("social.circle_archive", "social_circles", id, {});
  revalidatePath("/admin/social");
  return ok("Saved.");
}

// ─── Connection preferences (progressive assessment) ──────────────
export async function saveConnectionPreferences(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  const { SECTIONS } = await import("@/lib/connection-intelligence");
  const section = SECTIONS.find((x) => x.id === s(f, "section"));
  const { data: cur } = await m.db.from("social_preferences").select("answers, elite_only").eq("user_id", m.viewer.id).maybeSingle();
  const answers: Record<string, unknown> = { ...((cur?.answers as Record<string, unknown>) ?? {}) };
  if (section) {
    for (const q of section.questions) {
      const allowed = new Set(q.options.map(([k]) => k));
      if (q.multi) answers[q.id] = f.getAll(q.id).map(String).filter((v) => allowed.has(v)).slice(0, q.id === "values" ? 3 : 9);
      else { const v = s(f, q.id, 40); if (allowed.has(v)) answers[q.id] = v; else delete answers[q.id]; }
    }
  }
  const eliteOnly = f.has("elite_only_form")
    ? f.getAll("elite_only").map(String).filter((v) => ["business", "peers", "friendship", "social", "travel", "couples_friendship"].includes(v))
    : (cur?.elite_only as string[] | undefined) ?? [];
  const { error } = await m.db.from("social_preferences").upsert({ user_id: m.viewer.id, answers, elite_only: eliteOnly, updated_at: new Date().toISOString() });
  if (error) return fail("Not saved.");
  revalidatePath("/app/connect", "layout");
  return ok("Saved. Your recommendations now reflect this.");
}

export async function clearConnectionPreferences(_p: ActionResult, _f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return SIGN_IN;
  await m.db.from("social_preferences").delete().eq("user_id", m.viewer.id);
  revalidatePath("/app/connect", "layout");
  return ok("Your connection preferences were deleted.");
}

// ─── Owner: categories and official circles ───────────────────────
export async function saveCircleCategory(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st || !hasRole(st.viewer, ["owner"])) return fail("Only the owner can do this.");
  const key = s(f, "key", 40).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const name = s(f, "name", 80);
  if (key.length < 2 || name.length < 2) return fail("Add a key and a name.");
  const { error } = await st.db.from("social_circle_categories").upsert({ key, name, description: s(f, "description", 400) || null, sort: Number(s(f, "sort")) || 100, status: f.get("hidden") === "on" ? "hidden" : "active" });
  if (error) return fail("Not saved.");
  await audit("social.category", "social_circle_categories", key, { name });
  revalidatePath("/admin/social");
  return ok("Category saved.");
}

export async function createOfficialCircle(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st || !hasRole(st.viewer, ["owner"])) return fail("Only the owner can do this.");
  const name = s(f, "name", 80); if (name.length < 3) return fail("Give the circle a name.");
  const kind = ["open", "specialized", "elite"].includes(s(f, "kind")) ? s(f, "kind") : "open";
  const eligibility = kind === "elite" ? "elite" : ["all", "couples", "singles"].includes(s(f, "eligibility")) ? s(f, "eligibility") : "all";
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}-${randomUUID().slice(0, 4)}`;
  const { error } = await st.db.from("social_circles").insert({ slug, name, tagline: s(f, "tagline", 160) || null, category: s(f, "category", 40), kind, eligibility, interests: cleanList(f.getAll("interests"), INTERESTS, 6), status: "active", is_official: true, created_by: st.viewer.id });
  if (error) return fail("Not saved. Check the category.");
  await audit("social.circle_create", "social_circles", slug, { kind, eligibility });
  revalidatePath("/admin/social");
  return ok("Circle created.");
}

export async function renameCircle(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const st = await staff(); if (!st || !hasRole(st.viewer, ["owner"])) return fail("Only the owner can do this.");
  const id = s(f, "id", 40); const name = s(f, "name", 80);
  if (!UUID.test(id) || name.length < 3) return fail("Add a name.");
  await st.db.from("social_circles").update({ name, tagline: s(f, "tagline", 160) || null, category: s(f, "category", 40) }).eq("id", id);
  await audit("social.circle_rename", "social_circles", id, { name });
  revalidatePath("/admin/social");
  return ok("Saved.");
}
