"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireExperience } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { CONTACT, FUTURE, HELP_NEEDED, HELP_OFFERED, MENTORSHIP, RELATIONSHIPS, SCOPES, STAGES, STRUCTURES, US_STATES, YEARS } from "@/lib/business-options";
import type { ActionResult } from "@/app/actions/admin";
import { friendly } from "@/lib/connect360";

/**
 * The Professional Society — member actions. Every rule (who can post, who
 * can be contacted, who can read a conversation) is enforced again by the
 * database; these checks give friendly messages.
 */
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const pick = (f: FormData, k: string, allowed: Record<string, string>) => f.getAll(k).map(String).filter((v) => v in allowed);
const oneOf = (v: string, allowed: Record<string, string>) => (v in allowed ? v : null);
const dbMessage = (e: { message?: string } | null, fallback: string) =>
  e?.message && /REGULATED_ACTIVITY|SAFETY_SHIELD/.test(e.message) ? friendly(e.message, fallback)
  : e?.message && /limit|waiting|closed|links|recipient|accept/i.test(e.message) ? e.message : fallback;

async function db() {
  const { viewer } = await requireExperience("business");
  const supabase = (await createClient())!;
  return { viewer, supabase, biz: supabase.schema("business") };
}

/** "Let's Talk About Your Business" — the business profile and both sides of the community. */
export async function saveBusinessProfile(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const company = str(f, "company", 160);
  if (!company) return fail("Please enter your business name.");
  const state = str(f, "state", 2).toUpperCase();
  const consent = f.get("publicConsent") === "on";
  const profile = {
    user_id: viewer.id,
    company,
    display_name: str(f, "displayName", 120) || null,
    headline: str(f, "headline", 200) || null,
    industry: str(f, "industry", 60) || null,
    business_structure: oneOf(str(f, "structure"), STRUCTURES),
    years_in_business: oneOf(str(f, "years"), YEARS),
    stage: oneOf(str(f, "stage"), STAGES),
    offerings: str(f, "offerings") || null,
    leadership_role: str(f, "role", 160) || null,
    challenges: str(f, "challenges") || null,
    goals_short: str(f, "goalsShort") || null,
    goals_long: str(f, "goalsLong") || null,
    about: str(f, "about") || null,
    expertise: str(f, "expertise", 600).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
    relationships_desired: pick(f, "relationships", RELATIONSHIPS),
    mentorship: oneOf(str(f, "mentorship"), MENTORSHIP) ?? "none",
    future_interests: pick(f, "future", FUTURE),
    help_needed: pick(f, "helpNeeded", HELP_NEEDED),
    help_offered: pick(f, "helpOffered", HELP_OFFERED),
    seeking: pick(f, "helpNeeded", HELP_NEEDED),
    offering: pick(f, "helpOffered", HELP_OFFERED),
    city: str(f, "city", 80) || null,
    state: state in US_STATES ? state : null,
    connection_scope: oneOf(str(f, "scope"), SCOPES) ?? "national",
    accept_requests_from: oneOf(str(f, "contact"), CONTACT) ?? "members",
    is_visible: f.get("visibleToMembers") === "on",
    public_profile_consent: consent,
    onboarding_completed_at: new Date().toISOString(),
  };
  const { error } = await biz.from("profiles").upsert(profile, { onConflict: "user_id" });
  if (error) return fail("Your profile could not be saved. Please try again.");

  // Optional and private: never visible to other members, staff or the owner.
  const revenue = str(f, "revenue");
  const employees = str(f, "employees");
  if (revenue || employees) {
    await biz.from("private_details").upsert({ user_id: viewer.id, annual_revenue_range: revenue || null, employee_range: employees || null, updated_at: new Date().toISOString() });
  }
  revalidatePath("/app/business");
  if (f.get("from") === "onboarding") redirect("/app/business?welcome=1");
  return ok("Your business profile is saved.");
}

export async function saveGoal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const id = str(f, "id", 40);
  const title = str(f, "title", 200);
  const progress = Math.max(0, Math.min(100, Number(f.get("progress") ?? 0) || 0));
  const status = ["active", "achieved", "paused"].includes(str(f, "status")) ? str(f, "status") : "active";
  if (f.get("delete") === "1" && id) {
    await biz.from("goals").delete().eq("id", id).eq("user_id", viewer.id);
  } else if (id) {
    await biz.from("goals").update({ progress, status: progress >= 100 ? "achieved" : status }).eq("id", id).eq("user_id", viewer.id);
  } else {
    if (!title) return fail("Describe your goal.");
    const { error } = await biz.from("goals").insert({ user_id: viewer.id, title, horizon: str(f, "horizon") === "long" ? "long" : "short", target_date: str(f, "targetDate") || null });
    if (error) return fail("Goal not saved.");
  }
  revalidatePath("/app/business");
  return ok("Saved.");
}

export async function toggleReadiness(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const key = str(f, "key", 60);
  if (f.get("done") === "1") await biz.from("readiness_progress").upsert({ user_id: viewer.id, item_key: key });
  else await biz.from("readiness_progress").delete().eq("user_id", viewer.id).eq("item_key", key);
  revalidatePath("/app/business");
  return ok("Updated.");
}

export async function setFeatureInterest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const key = str(f, "key", 60);
  if (f.get("on") === "1") await biz.from("feature_interest").upsert({ user_id: viewer.id, feature_key: key, notify: true });
  else await biz.from("feature_interest").delete().eq("user_id", viewer.id).eq("feature_key", key);
  revalidatePath("/app/business");
  return ok(f.get("on") === "1" ? "We’ll let you know when it’s available." : "Removed.");
}

// ─── Connection Board ──────────────────────────────────────────────
const postSchema = z.object({
  intent: z.enum(["seeking_assistance", "offering_assistance", "open_to_collaboration"]),
  category: z.string().min(2).max(60),
  title: z.string().trim().min(3, "Add a short title.").max(120),
  description: z.string().trim().min(10, "Describe what you need or can offer.").max(3000),
  industry: z.string().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().max(2).optional(),
  scope: z.enum(["local", "state", "national"]),
  stage: z.enum(["", "idea", "early", "growth", "established", "enterprise"]),
  expertise: z.string().max(600),
});

export async function savePost(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const parsed = postSchema.safeParse({
    intent: f.get("intent"), category: str(f, "category"), title: str(f, "title"), description: str(f, "description", 3000),
    industry: str(f, "industry") || undefined, city: str(f, "city") || undefined, state: str(f, "state").toUpperCase() || undefined,
    scope: str(f, "scope") || "national", stage: str(f, "stage"), expertise: str(f, "expertise", 600),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your post.");
  const d = parsed.data;
  const row = {
    intent: d.intent, category: d.category, title: d.title, description: d.description, industry: d.industry ?? null,
    city: d.city ?? null, state: d.state && d.state in US_STATES ? d.state : null, scope: d.scope, stage: d.stage || null,
    expertise: d.expertise.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
  };
  const id = str(f, "id", 40);
  if (id) {
    const { error } = await biz.from("posts").update(row).eq("id", id).eq("author_id", viewer.id);
    if (error) return fail("Post not saved.");
    revalidatePath(`/app/business/board/${id}`);
    return ok("Post updated.");
  }
  if (!(await allow("business-post", 10, 3600))) return fail("Too many posts. Please try again later.");
  const { data, error } = await biz.from("posts").insert({ ...row, author_id: viewer.id }).select("id").single();
  if (error || !data) return fail(dbMessage(error, "Your post could not be published. The Connection Board may not be available yet."));
  revalidatePath("/app/business/board");
  redirect(`/app/business/board/${data.id}`);
}

export async function setPostStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const status = str(f, "status");
  if (!["open", "connection_established", "assistance_received", "completed", "closed", "archived"].includes(status)) return fail("Invalid status.");
  const { error } = await biz.from("posts").update({ status }).eq("id", str(f, "id", 40)).eq("author_id", viewer.id);
  if (error) return fail("Not updated.");
  revalidatePath("/app/business/board");
  return ok("Status updated.");
}

export async function toggleSavedPost(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const id = str(f, "id", 40);
  if (f.get("on") === "1") await biz.from("saved_posts").upsert({ user_id: viewer.id, post_id: id });
  else await biz.from("saved_posts").delete().eq("user_id", viewer.id).eq("post_id", id);
  revalidatePath(`/app/business/board/${id}`);
  return ok(f.get("on") === "1" ? "Saved." : "Removed from saved.");
}

/** "I Can Help — Connect Privately": a request with one introduction the other owner can accept or decline. */
export async function connectPrivately(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const postId = str(f, "postId", 40);
  const intro = str(f, "message", 4000);
  if (intro.length < 20) return fail("Introduce yourself and explain how you can help (a few sentences).");
  if (!(await allow("business-connect", 20, 86400))) return fail("You’ve reached today’s limit for new connection requests.");
  const { data: post } = await biz.from("posts").select("author_id").eq("id", postId).maybeSingle();
  if (!post) return fail("This post is no longer available.");
  if (post.author_id === viewer.id) return fail("This is your own post.");
  const { data: conv, error } = await biz.from("conversations").insert({ post_id: postId, requester_id: viewer.id, recipient_id: post.author_id }).select("id").single();
  if (error || !conv) {
    if (error?.code === "23505") return fail("You’ve already reached out about this post. Check your inbox.");
    return fail(dbMessage(error, "This owner isn’t accepting new requests right now."));
  }
  const { error: e2 } = await biz.from("messages").insert({ conversation_id: conv.id, sender_id: viewer.id, body: intro });
  if (e2) return fail(dbMessage(e2, "Your introduction could not be sent."));
  revalidatePath("/app/business/inbox");
  redirect(`/app/business/inbox/${conv.id}`);
}

export async function respondToRequest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { biz } = await db();
  const decision = str(f, "decision");
  if (!["accepted", "declined"].includes(decision)) return fail("Invalid choice.");
  const { error } = await biz.from("conversations").update({ status: decision }).eq("id", str(f, "id", 40));
  if (error) return fail(dbMessage(error, "Not updated."));
  revalidatePath("/app/business/inbox");
  return ok(decision === "accepted" ? "Connection accepted. You can now message each other." : "Request declined. They won’t be able to message you about this post.");
}

export async function sendBusinessMessage(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const body = str(f, "body", 4000);
  if (!body) return fail("Write a message.");
  if (!(await allow("business-message", 60, 3600))) return fail("You’re sending messages too quickly. Please wait a moment.");
  const id = str(f, "id", 40);
  const { error } = await biz.from("messages").insert({ conversation_id: id, sender_id: viewer.id, body });
  if (error) return fail(dbMessage(error, "Message not sent."));
  revalidatePath(`/app/business/inbox/${id}`);
  return ok("Sent.");
}

export async function updateConversation(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const id = str(f, "id", 40);
  const { data: c } = await biz.from("conversations").select("requester_id, recipient_id, requester_saved, recipient_saved").eq("id", id).maybeSingle();
  if (!c) return fail("Conversation not found.");
  const mine = c.requester_id === viewer.id ? "requester_saved" : "recipient_saved";
  const action = str(f, "action");
  let patch: Record<string, unknown> = {};
  if (action === "save") patch = { [mine]: !(c as Record<string, unknown>)[mine] };
  else if (action === "close") patch = { status: "closed" };
  else if (["connection_established", "assistance_received", "completed"].includes(action)) patch = { outcome: action };
  else return fail("Invalid action.");
  const { error } = await biz.from("conversations").update(patch).eq("id", id);
  if (error) return fail(dbMessage(error, "Not updated."));
  revalidatePath(`/app/business/inbox/${id}`);
  return ok("Updated.");
}

export async function acknowledgeHelp(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const id = str(f, "id", 40);
  const { data: c } = await biz.from("conversations").select("requester_id, recipient_id").eq("id", id).maybeSingle();
  if (!c) return fail("Conversation not found.");
  const to = c.requester_id === viewer.id ? c.recipient_id : c.requester_id;
  const { error } = await biz.from("acknowledgements").insert({ from_user: viewer.id, to_user: to, conversation_id: id, note: str(f, "note", 600) || null, is_public: f.get("public") === "on" });
  if (error) return fail(error.code === "23505" ? "You’ve already thanked them for this connection." : "Not saved.");
  return ok("Thank you — your acknowledgement was shared with them.");
}

export async function reportBusiness(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await db();
  const reason = str(f, "reason");
  if (!["spam", "solicitation", "fraud", "harassment", "impersonation", "inappropriate", "other"].includes(reason)) return fail("Choose a reason.");
  if (!(await allow("business-report", 10, 86400))) return fail("Too many reports today. Please email info@theartofconnect.com.");
  const { error } = await biz.from("reports").insert({
    reporter_id: viewer.id, reason, details: str(f, "details", 2000) || null,
    post_id: str(f, "postId", 40) || null, conversation_id: str(f, "conversationId", 40) || null, reported_user_id: str(f, "userId", 40) || null,
  });
  if (error) return fail("Report not sent.");
  if (f.get("block") === "on" && str(f, "userId", 40)) {
    const supabase = (await createClient())!;
    await supabase.from("blocks").insert({ blocker_id: viewer.id, blocked_id: str(f, "userId", 40) });
  }
  revalidatePath("/app/business/inbox");
  return ok("Thank you. Our team will review this confidentially.");
}
