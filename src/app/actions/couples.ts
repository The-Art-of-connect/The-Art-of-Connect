"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isInsidePreview, requireExperience } from "@/lib/auth";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { env } from "@/lib/env";
import { DATE_KINDS, SURPRISE_KINDS } from "@/lib/couples";
import type { ActionResult } from "@/app/actions/admin";

/**
 * The Personal Society — couples. The database enforces every rule:
 * only partners see invitations, plans and surprises belong to their author,
 * and a date only reaches the shared calendar once the partner accepts.
 */
const PATH = "/app/relationships/us";
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

async function member() {
  const { viewer } = await requireExperience("relationships");
  if (isInsidePreview(viewer)) return null;
  const supabase = (await createClient())!;
  const rel = supabase.schema("relationships");
  const { data: cm } = await rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle();
  return { viewer, rel, coupleId: (cm?.couple_id as string | undefined) ?? null };
}

async function partnerOf(m: NonNullable<Awaited<ReturnType<typeof member>>>) {
  if (!m.coupleId) return null;
  const { data } = await m.rel.from("couple_members").select("user_id").eq("couple_id", m.coupleId).neq("user_id", m.viewer.id).maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

/** Invite a partner by email: a secure, single-use link that only works for that address. */
export async function invitePartner(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is sent.");
  const email = z.email().safeParse(str(f, "email", 200).toLowerCase());
  if (!email.success) return fail("Please enter your partner’s email address.");
  if (email.data === m.viewer.email.toLowerCase()) return fail("Please enter your partner’s email, not your own.");
  if (!(await allow("partner-invite", 5, 3600))) return fail("Too many invitations. Please try again later.");
  if (await partnerOf(m)) return fail("You’re already connected with your partner.");
  let coupleId = m.coupleId;
  if (!coupleId) {
    const { data, error } = await m.rel.rpc("start_couple");
    if (error || !data) return fail("We couldn’t start your shared space. Please try again.");
    coupleId = data as string;
  }
  const token = randomBytes(32).toString("base64url");
  const { error } = await m.rel.from("partner_invitations").insert({
    couple_id: coupleId, inviter_id: m.viewer.id, invitee_email: email.data, token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) return fail("The invitation wasn’t created. Please try again.");
  const link = `${env.siteUrl.replace(/\/$/, "")}/app/relationships/join?token=${token}`;
  const sent = await sendEmail(email.data, templates.partnerInvitation({ name: m.viewer.displayName?.split(" ")[0] || "Your partner", link }), { category: "membership" });
  revalidatePath(PATH);
  return sent.ok
    ? ok("Your invitation is on its way. Your shared space opens when your partner accepts.")
    : ok("Invitation created. Email delivery is limited before launch — your partner can accept from the link once emails are enabled.");
}

/** Accept a partner invitation (must be signed in with the invited email). */
export async function acceptPartner(f: FormData) {
  const { viewer } = await requireExperience("relationships");
  if (isInsidePreview(viewer)) redirect(PATH);
  const token = str(f, "token", 200);
  const supabase = (await createClient())!;
  const { error } = await supabase.schema("relationships").rpc("accept_partner_invitation", { token });
  redirect(error ? `/app/relationships/join?token=${encodeURIComponent(token)}&error=${encodeURIComponent(/different email/.test(error.message) ? "email" : "invalid")}` : `${PATH}?welcome=1`);
}

const When = z.iso.datetime({ offset: true }).refine((v) => new Date(v).getTime() > Date.now(), "Please choose a future date and time.");

/** Propose a date. Nothing is planned or placed on the calendar until the partner accepts. */
export async function sendDateInvitation(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is sent.");
  const partner = await partnerOf(m);
  if (!partner || !m.coupleId) return fail("Date invitations open once your partner joins your shared space.");
  const parsed = z.object({
    kind: z.enum(Object.keys(DATE_KINDS) as [string, ...string[]]),
    title: z.string().trim().min(2).max(120),
    message: z.string().trim().max(1000),
    when: When,
    duration: z.coerce.number().int().min(30).max(4320),
  }).safeParse({ kind: f.get("kind"), title: f.get("title"), message: f.get("message") ?? "", when: f.get("when"), duration: f.get("duration") ?? 180 });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message.includes("future") ? "Please choose a future date and time." : "Add a title and a date and time.");
  const { error } = await m.rel.from("date_invitations").insert({
    couple_id: m.coupleId, from_user: m.viewer.id, to_user: partner, kind: parsed.data.kind, title: parsed.data.title,
    message: parsed.data.message || null, keep_secret: f.get("secret") === "on", proposed_at: parsed.data.when, duration_minutes: parsed.data.duration,
  });
  if (error) return fail("Your invitation wasn’t sent. Please try again.");
  revalidatePath(PATH);
  return ok("Your invitation has been sent. You’ll be able to plan the details once it’s accepted.");
}

export async function respondDateInvitation(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const decision = str(f, "decision", 20);
  const suggested = str(f, "suggested", 40);
  const { error } = await m.rel.rpc("respond_date_invitation", {
    p_id: str(f, "id", 40), p_decision: decision, p_note: str(f, "note", 500) || null, p_suggested: decision === "new_time" && suggested ? suggested : null,
  });
  if (error) {
    if (/choose another date/.test(error.message)) return fail("That time doesn’t work on your calendar. Suggest another time instead.");
    if (/future/.test(error.message)) return fail("Please suggest a future date and time.");
    return fail("That response wasn’t saved. Please try again.");
  }
  revalidatePath(PATH);
  revalidatePath("/app/relationships/calendar");
  return ok(decision === "accepted" ? "Accepted — it’s on your shared calendar." : decision === "new_time" ? "Your suggested time has been shared." : "Your response has been shared kindly.");
}

export async function cancelDateInvitation(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  await m.rel.rpc("cancel_date_invitation", { p_id: str(f, "id", 40) });
  revalidatePath(PATH);
  return ok("Invitation withdrawn.");
}

/** Private planning notes for an accepted date — visible to the planner alone. */
export async function saveDatePlan(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  const checklist = f.getAll("item").map(String).map((t, i) => ({ t: t.slice(0, 120), done: f.get(`done-${i}`) === "on" })).filter((x) => x.t.trim()).slice(0, 30);
  const { error } = await m.rel.from("date_plans").upsert({
    invitation_id: str(f, "id", 40), planner: m.viewer.id, notes: str(f, "notes", 4000) || null, checklist, updated_at: new Date().toISOString(),
  }, { onConflict: "invitation_id" });
  if (error) return fail("Your plan wasn’t saved.");
  revalidatePath(PATH);
  return ok("Saved — only you can see your plans.");
}

/** Surprises need no request; they stay hidden from your partner until the reveal time you choose. */
export async function planSurprise(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  if (!m.coupleId || !(await partnerOf(m))) return fail("Surprises open once your partner joins your shared space.");
  const parsed = z.object({
    kind: z.enum(Object.keys(SURPRISE_KINDS) as [string, ...string[]]),
    title: z.string().trim().min(2).max(120),
    message: z.string().trim().max(1000),
    notes: z.string().trim().max(4000),
    reveal: z.iso.datetime({ offset: true }),
  }).safeParse({ kind: f.get("kind"), title: f.get("title"), message: f.get("message") ?? "", notes: f.get("notes") ?? "", reveal: f.get("reveal") });
  if (!parsed.success) return fail("Add a title and when your partner should see it.");
  const { error } = await m.rel.from("surprises").insert({
    couple_id: m.coupleId, from_user: m.viewer.id, kind: parsed.data.kind, title: parsed.data.title,
    message: parsed.data.message || null, private_notes: parsed.data.notes || null, reveal_at: parsed.data.reveal,
  });
  if (error) return fail("Your surprise wasn’t saved.");
  revalidatePath(PATH);
  return ok("Your surprise is planned — it stays hidden until the moment you chose.");
}

export async function removeSurprise(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member();
  if (!m) return fail("Preview only — nothing is saved.");
  await m.rel.from("surprises").delete().eq("id", str(f, "id", 40));
  revalidatePath(PATH);
  return ok("Removed.");
}
