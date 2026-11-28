"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isInsidePreview, requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { GENDERS, INTENTS, MOODS, REFLECTION_PROMPTS, SEEKING } from "@/lib/in-love";

/**
 * In Love (founder directive 38). The database enforces every rule: discovery shows only eligible, visible,
 * identity-verified singles; interest needs both members to be eligible; messaging needs a mutual connection; couples data
 * belongs to the two partners; check-ins stay private unless shared; becoming a couple needs both partners' consent.
 */
type R = { ok: boolean; message: string; url?: string } | null;
const ok = (message: string, url?: string): R => ({ ok: true, message, url });
const fail = (message: string): R => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const UUID = z.string().uuid();
const refresh = () => ["/app/relationships", "/app/relationships/connections", "/app/relationships/checkin", "/app/relationships/profile"].forEach((p) => revalidatePath(p));

async function member() {
  const { viewer } = await requireExperience("relationships");
  if (isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = (await createClient())!;
  return { viewer, db, rel: db.schema("relationships") };
}

export async function saveLoveProfile(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is saved.");
  const intent = str(f, "intent", 30);
  const row = {
    user_id: m.viewer.id, headline: str(f, "headline", 120) || null, about: str(f, "about", 1500) || null, city: str(f, "city", 80) || null,
    relationship_intent: intent in INTENTS ? intent : null, is_visible: f.get("visible") === "on", track: "single", updated_at: new Date().toISOString(),
    gender: str(f, "gender", 20) in GENDERS ? str(f, "gender", 20) : null,
    seeking: f.getAll("seeking").map(String).filter((x) => x in SEEKING),
  };
  const { error } = await m.rel.from("profiles").upsert(row, { onConflict: "user_id" });
  if (error) return fail("Your profile couldn't be saved. Please try again.");
  refresh();
  return ok(row.is_visible ? "Saved. Your profile is visible to compatible, verified singles." : "Saved. Your profile is private until you choose to be visible.");
}

export async function expressInterest(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is sent.");
  const to = UUID.safeParse(str(f, "to", 40));
  if (!to.success) return fail("Please try again.");
  if (!(await allow("love-interest", 30, 86400))) return fail("You've expressed interest many times today. Please continue tomorrow.");
  const { error } = await m.rel.from("connections").insert({ requester_id: m.viewer.id, recipient_id: to.data });
  if (error) return fail(/row-level security/.test(error.message) ? "Interest opens once both of you have completed identity verification." : "That couldn't be sent. Please try again.");
  refresh();
  return ok("Your interest was sent privately. If they feel the same, you'll be connected.");
}

export async function respondInterest(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const id = UUID.safeParse(str(f, "id", 40));
  const status = str(f, "answer", 10) === "accept" ? "accepted" : "declined";
  if (!id.success) return fail("Please try again.");
  const { error } = await m.rel.from("connections").update({ status }).eq("id", id.data).eq("recipient_id", m.viewer.id).eq("status", "pending");
  if (error) return fail("That couldn't be saved.");
  refresh();
  return ok(status === "accepted" ? "You're connected. You can now send a private message." : "Declined privately. They won't be told why.");
}

export async function messageConnection(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const to = UUID.safeParse(str(f, "to", 40));
  if (!to.success) return fail("Please try again.");
  const { data, error } = await m.rel.rpc("start_love_conversation", { p_other: to.data });
  if (error || !data) return fail("Messaging opens once you have both accepted the connection.");
  return ok("Opening your conversation…", `/app/connect/messages/${data}`);
}

export async function becomeCouple(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const partner = UUID.safeParse(str(f, "partner", 40));
  if (!partner.success) return fail("Please try again.");
  if (f.get("withdraw") === "1") {
    await m.rel.rpc("withdraw_couple_consent", { p_partner: partner.data });
    refresh(); revalidatePath("/app/relationships/exclusive");
    return ok("Withdrawn. Nothing has changed between you.");
  }
  const { data, error } = await m.rel.rpc("become_couple", { p_partner: partner.data });
  if (error) return fail(error.message.includes("Exclusive") ? "Becoming a couple starts with an accepted Exclusive Connection." : "That couldn't be completed. Please try again.");
  refresh(); revalidatePath("/app/relationships/exclusive");
  return data === "couple"
    ? ok("Welcome to your shared space. Your personal journal, reflections and discoveries remain yours alone.", "/app/relationships")
    : ok("Your choice is saved. Your shared space opens when your partner chooses too.");
}

export async function saveCheckin(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is saved.");
  const mood = str(f, "mood", 20);
  if (!(mood in MOODS)) return fail("Choose how you're feeling.");
  const { data: cm } = await m.rel.from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  if (!cm) return fail("Check-ins open once your partner joins your shared space.");
  const shared = f.get("shared") === "on";
  const { error } = await m.rel.from("couple_checkins").upsert(
    { couple_id: cm.couple_id, user_id: m.viewer.id, day: new Date().toISOString().slice(0, 10), mood, note: str(f, "note", 1000) || null, shared },
    { onConflict: "couple_id,user_id,day" });
  if (error) return fail("Your check-in couldn't be saved.");
  refresh();
  return ok(shared ? "Shared with your partner." : "Saved privately. Only you can see it.");
}

export async function addGoal(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is saved.");
  const title = str(f, "title", 120);
  if (title.length < 2) return fail("Name your shared goal.");
  const { data: cm } = await m.rel.from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  if (!cm) return fail("Shared goals open once your partner joins.");
  const { error } = await m.rel.from("couple_goals").insert({ couple_id: cm.couple_id, created_by: m.viewer.id, title, details: str(f, "details", 1000) || null });
  if (error) return fail("That goal couldn't be saved.");
  refresh();
  return ok("Added to your shared goals.");
}

export async function setGoalStatus(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const id = UUID.safeParse(str(f, "id", 40)); const status = str(f, "status", 12);
  if (!id.success || !["active", "achieved", "archived"].includes(status)) return fail("Please try again.");
  const { error } = await m.rel.from("couple_goals").update({ status }).eq("id", id.data);
  if (error) return fail("That couldn't be updated.");
  refresh();
  return ok(status === "achieved" ? "Celebrated together." : "Updated.");
}

/** Invite a partner by email: a secure, single-use link that only works for that address (reused from the couples work). */
export async function invitePartner(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is sent.");
  const email = z.email().safeParse(str(f, "email", 200).toLowerCase());
  if (!email.success) return fail("Please enter your partner's email address.");
  if (email.data === m.viewer.email.toLowerCase()) return fail("Please enter your partner's email, not your own.");
  if (!(await allow("partner-invite", 5, 3600))) return fail("Too many invitations. Please try again later.");
  const { data: cm } = await m.rel.from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  let coupleId = (cm?.couple_id as string | undefined) ?? null;
  if (coupleId) {
    const { count } = await m.rel.from("couple_members").select("user_id", { count: "exact", head: true }).eq("couple_id", coupleId);
    if ((count ?? 0) > 1) return fail("Your partner has already joined your shared space.");
  } else {
    const { data, error } = await m.rel.rpc("start_couple");
    if (error || !data) return fail("We couldn't start your shared space. Please try again.");
    coupleId = data as string;
  }
  const token = randomBytes(32).toString("base64url");
  const { error } = await m.rel.from("partner_invitations").insert({
    couple_id: coupleId, inviter_id: m.viewer.id, invitee_email: email.data, token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) return fail("The invitation wasn't created. Please try again.");
  const link = `${env.siteUrl.replace(/\/$/, "")}/app/relationships/join?token=${token}`;
  const sent = await sendEmail(email.data, templates.partnerInvitation({ name: m.viewer.displayName?.split(" ")[0] || "Your partner", link }), { category: "membership" });
  refresh();
  return sent.ok
    ? ok("Your invitation is on its way. Your shared space opens when your partner accepts.")
    : ok("Invitation created. Email delivery is limited before launch, so your partner can accept from the link once emails are enabled.");
}

export async function acceptPartner(f: FormData) {
  const { viewer } = await requireExperience("relationships");
  if (isInsidePreview(viewer)) redirect("/app/relationships");
  const token = str(f, "token", 200);
  const db = (await createClient())!;
  const { error } = await db.schema("relationships").rpc("accept_partner_invitation", { token });
  redirect(error ? `/app/relationships/join?token=${encodeURIComponent(token)}&error=${/different email/.test(error.message) ? "email" : "invalid"}` : "/app/relationships?welcome=1");
}

// ─── Private reflections (directive 51 §7; directive 47) ───────────────────────────────────────────────────────────────
// The database keeps every reflection private to its author. A partner can read one only when the author shares it, and
// only while both are in the same couple; when the couple ends, sharing ends automatically.
const REFLECTIONS = "/app/relationships/reflections";

/** The member's couple, and whether both partners have joined it. */
async function myCouple(m: NonNullable<Awaited<ReturnType<typeof member>>>) {
  const { data: cm } = await m.rel.from("couple_members").select("couple_id").eq("user_id", m.viewer.id).maybeSingle();
  if (!cm) return null;
  const { count } = await m.rel.from("couple_members").select("user_id", { count: "exact", head: true }).eq("couple_id", cm.couple_id);
  return { coupleId: cm.couple_id as string, active: (count ?? 0) > 1 };
}

export async function saveReflection(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is saved.");
  const body = str(f, "body", 4000);
  if (body.length < 2) return fail("Write a few words for your reflection.");
  const id = str(f, "id", 40);
  if (id) {
    if (!UUID.safeParse(id).success) return fail("Please try again.");
    const { data, error } = await m.rel.from("private_reflections").update({ body, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", m.viewer.id).select("id");
    if (error || !data?.length) return fail("Your reflection couldn't be updated. Please try again.");
    revalidatePath(REFLECTIONS);
    return ok("Updated. It stays exactly as private (or shared) as it was.");
  }
  if (!(await allow("reflection", 60, 86400))) return fail("You've written many reflections today. Please continue tomorrow.");
  const promptIn = str(f, "prompt", 200);
  const prompt = (REFLECTION_PROMPTS as readonly string[]).includes(promptIn) ? promptIn : null;
  const { error } = await m.rel.from("private_reflections").insert({ user_id: m.viewer.id, prompt, body });
  if (error) return fail("Your reflection couldn't be saved. Please try again.");
  revalidatePath(REFLECTIONS);
  return ok("Saved privately. Only you can read it.");
}

export async function deleteReflection(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const id = UUID.safeParse(str(f, "id", 40));
  if (!id.success) return fail("Please try again.");
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm. Deleting a reflection can't be undone.");
  const { data, error } = await m.rel.from("private_reflections").delete().eq("id", id.data).eq("user_id", m.viewer.id).select("id");
  if (error || !data?.length) return fail("That reflection couldn't be deleted. Please try again.");
  revalidatePath(REFLECTIONS);
  return ok("Deleted.");
}

export async function shareReflection(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const id = UUID.safeParse(str(f, "id", 40));
  if (!id.success) return fail("Please try again.");
  const share = f.get("share") === "1";
  let patch: { shared_at: string | null; shared_couple_id: string | null } = { shared_at: null, shared_couple_id: null };
  if (share) {
    const c = await myCouple(m);
    if (!c?.active) return fail("Sharing opens once your partner has joined your shared space.");
    patch = { shared_at: new Date().toISOString(), shared_couple_id: c.coupleId };
  }
  const { data, error } = await m.rel.from("private_reflections").update(patch).eq("id", id.data).eq("user_id", m.viewer.id).select("id");
  if (error || !data?.length) return fail("That couldn't be changed. Please try again.");
  revalidatePath(REFLECTIONS);
  return ok(share ? "Shared with your partner. They'll be told a reflection is waiting, never what it says." : "Private again. Your partner can no longer read it.");
}

// ─── Couples Connection Community (directive 08): Couples Connection Circles in Find Your Circle ───────────────────────
const COMMUNITY = "/app/relationships/community";

export async function couplesCircle(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only.");
  const id = UUID.safeParse(str(f, "circle_id", 40));
  if (!id.success) return fail("Please try again.");
  if (str(f, "op", 10) === "leave") {
    const { error } = await m.db.from("social_circle_members").delete().eq("circle_id", id.data).eq("user_id", m.viewer.id);
    if (error) return fail("That couldn't be completed. Please try again.");
    revalidatePath(COMMUNITY); revalidatePath("/app/connect", "layout");
    return ok("You've left the circle. You can rejoin whenever you like.");
  }
  const { error } = await m.db.from("social_circle_members").insert({ circle_id: id.data, user_id: m.viewer.id });
  if (error) {
    if (error.code === "23505") return ok("You're already a member.");
    const c = await myCouple(m);
    return fail(c?.active ? "This circle has membership requirements you don't meet yet." : "Couples Connection Circles open once your partner has joined your shared space.");
  }
  revalidatePath(COMMUNITY); revalidatePath("/app/connect", "layout");
  return ok("Welcome to the circle. Open it to meet the other couples.");
}

export async function proposeCouplesCircle(_p: R, f: FormData): Promise<R> {
  const m = await member();
  if (!m) return fail("Preview only: nothing is sent.");
  const name = str(f, "name", 80);
  if (name.length < 3) return fail("Give your circle a name of at least three characters.");
  const c = await myCouple(m);
  if (!c?.active) return fail("Proposing a circle opens once your partner has joined your shared space.");
  if (!(await allow("couples-circle-proposal", 3, 86400))) return fail("You've proposed several circles today. Please try again tomorrow.");
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "couples";
  const { error } = await m.db.from("social_circles").insert({
    slug: `${base}-${randomBytes(3).toString("hex")}`, name, tagline: str(f, "tagline", 160) || null, description: str(f, "description", 2000) || null,
    category: "couples", kind: "specialized", eligibility: "couples", status: "proposed", created_by: m.viewer.id,
  });
  if (error) return fail("Your proposal wasn't sent. Please try again.");
  revalidatePath(COMMUNITY);
  return ok("Thank you. Your circle is with our founder for approval; once approved, you'll host it.");
}
