"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireExperience, requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { allow } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { readImage } from "@/lib/uploads";
import type { ActionResult } from "@/app/actions/admin";

/**
 * The Knowledge Exchange. The database enforces who may host, approval,
 * private join links and the complimentary allowance; these actions add
 * friendly messages, validation and file handling.
 */
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const dbMsg = (e: { message?: string } | null, fallback: string) =>
  e?.message && /hosting|review|full|register|complimentary|opens|ended|link|owner/i.test(e.message) ? e.message : fallback;

async function member() {
  const { viewer } = await requireExperience("business");
  const supabase = (await createClient())!;
  return { viewer, supabase, biz: supabase.schema("business") };
}

export async function registerForWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const id = str(f, "id", 40);
  if (!(await allow("webinar-register", 30, 3600))) return fail("Too many requests. Please try again shortly.");
  const { data: existing } = await biz.from("webinar_registrations").select("canceled_at").eq("webinar_id", id).eq("user_id", viewer.id).maybeSingle();
  const { error } = existing
    ? await biz.from("webinar_registrations").update({ canceled_at: null, recording_consent: f.get("recordingConsent") === "on" }).eq("webinar_id", id).eq("user_id", viewer.id)
    : await biz.from("webinar_registrations").insert({ webinar_id: id, user_id: viewer.id, referral_source: str(f, "ref", 40).replace(/[^a-z0-9_-]/gi, "").toLowerCase() || null, recording_consent: f.get("recordingConsent") === "on" });
  if (error) return fail(dbMsg(error, "Registration isn’t available for this webinar."));
  revalidatePath(`/app/business/learn/${id}`);
  return ok("You’re registered. The room opens 15 minutes before the start time.");
}

export async function cancelRegistration(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const id = str(f, "id", 40);
  await biz.from("webinar_registrations").update({ canceled_at: new Date().toISOString() }).eq("webinar_id", id).eq("user_id", viewer.id);
  revalidatePath(`/app/business/learn/${id}`);
  return ok("Your registration is canceled.");
}

/** Releases the private meeting link (and records attendance) only when the member is eligible. */
export async function joinWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { biz } = await member();
  const { data, error } = await biz.rpc("join_webinar", { webinar: str(f, "id", 40) });
  if (error || !data) return fail(dbMsg(error, "You can’t join this webinar right now."));
  const url = (data as { join_url?: string }).join_url;
  if (!url?.startsWith("https://")) return fail("The meeting link isn’t available.");
  redirect(url);
}

export async function askQuestion(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const body = str(f, "body", 1000);
  if (body.length < 3) return fail("Write your question.");
  if (!(await allow("webinar-question", 20, 3600))) return fail("You’ve asked a lot of questions — please wait a little.");
  const { error } = await biz.from("webinar_questions").insert({ webinar_id: str(f, "id", 40), user_id: viewer.id, body });
  if (error) return fail("Please register for this webinar to ask a question.");
  return ok("Your question was sent to the host.");
}

export async function leaveFeedback(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const rating = Number(f.get("rating"));
  if (!(rating >= 1 && rating <= 5)) return fail("Choose a rating from 1 to 5.");
  const { error } = await biz.from("webinar_registrations").update({ feedback_rating: rating, feedback_text: str(f, "text", 2000) || null }).eq("webinar_id", str(f, "id", 40)).eq("user_id", viewer.id);
  if (error) return fail("Feedback not saved.");
  return ok("Thank you for your feedback.");
}

export async function registerHostInterest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const { error } = await biz.from("webinar_host_interest").upsert({ user_id: viewer.id, topics: str(f, "topics", 600) || null, note: str(f, "note", 1500) || null });
  if (error) return fail("Not saved.");
  return ok("Thank you — we’ll be in touch as hosting opens.");
}

/** Create or update a webinar (with optional uploads). Submitting sends it for review. */
export async function saveWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, supabase, biz } = await member();
  const id = str(f, "id", 40);
  const title = str(f, "title", 140);
  const description = str(f, "description", 5000);
  const startsLocal = str(f, "startsAt", 40);
  const tz = str(f, "timeZone", 60) || "America/Chicago";
  if (title.length < 5 || description.length < 20) return fail("Add a title and a description of at least a few sentences.");
  if (!startsLocal) return fail("Choose a date and time.");
  // The form sends the start time already converted to UTC by the browser.
  const starts = new Date(str(f, "startsAtUtc", 40) || startsLocal);
  if (Number.isNaN(starts.getTime()) || starts.getTime() < Date.now() + 15 * 60_000) return fail("Choose a start time at least 15 minutes from now.");
  const joinUrl = str(f, "joinUrl", 600);
  if (joinUrl && !joinUrl.startsWith("https://")) return fail("The meeting link must start with https://");
  const submit = f.get("intent") === "submit";
  if (f.get("rights") !== "on") return fail("Please confirm you own or have permission to use the images and content.");

  // Uploads: validated by their bytes; stored in the member's own folder.
  const paths: Record<string, string> = {};
  for (const [field, column] of [["promoImage", "promo_image_path"], ["logo", "logo_path"], ["headshot", "headshot_path"]] as const) {
    const img = await readImage(f.get(field));
    if (img && !img.ok) return fail(img.error);
    if (img && img.ok) {
      const path = `${viewer.id}/${img.name}`;
      const { error } = await supabase.storage.from("webinar-media").upload(path, img.bytes, { contentType: img.contentType, upsert: false });
      if (error) return fail("An image could not be uploaded. Please try again.");
      paths[column] = path;
    }
  }

  const row = {
    title, description,
    topic: str(f, "topic", 60) || null,
    industry: str(f, "industry", 60) || null,
    audience: str(f, "audience", 400) || null,
    learning_objectives: str(f, "objectives", 2000).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8),
    host_display_name: str(f, "hostName", 120) || "Professional Society member",
    host_bio: str(f, "hostBio", 1500) || null,
    co_hosts: str(f, "coHosts", 600) || null,
    starts_at: starts.toISOString(),
    time_zone: tz,
    duration_minutes: Math.max(15, Math.min(480, Number(f.get("duration")) || 60)),
    capacity: Number(f.get("capacity")) > 0 ? Math.min(10000, Number(f.get("capacity"))) : null,
    use_template: ["espresso", "cream", "burgundy", "own_flyer"].includes(str(f, "template")) ? str(f, "template") : "espresso",
    provider: ["zoom", "google_meet", "teams", "other"].includes(str(f, "provider")) ? str(f, "provider") : "zoom",
    resources: str(f, "resources", 3000) || null,
    recording_planned: f.get("recording") === "on",
    media_rights_confirmed: true,
    ...paths,
    ...(submit ? { status: "submitted" } : {}),
  };
  let webinarId = id;
  if (id) {
    const { error } = await biz.from("webinars").update(row).eq("id", id).eq("host_id", viewer.id);
    if (error) return fail(dbMsg(error, "Not saved."));
  } else {
    if (!(await allow("webinar-create", 10, 86400))) return fail("You’ve created many webinars today. Please try again tomorrow.");
    const { data, error } = await biz.from("webinars").insert({ ...row, host_id: viewer.id, status: submit ? "submitted" : "draft" }).select("id").single();
    if (error || !data) return fail(dbMsg(error, "Hosting is available to Professional Society members once it opens."));
    webinarId = data.id;
  }
  if (joinUrl) await biz.from("webinar_private").upsert({ webinar_id: webinarId, join_url: joinUrl, passcode: str(f, "passcode", 60) || null });
  revalidatePath("/app/business/learn");
  redirect(`/app/business/learn/host/${webinarId}?saved=${submit ? "submitted" : "draft"}`);
}

export async function cancelWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { viewer, biz } = await member();
  const id = str(f, "id", 40);
  const { error } = await biz.from("webinars").update({ status: "canceled" }).eq("id", id).eq("host_id", viewer.id);
  if (error) return fail("Not canceled.");
  revalidatePath(`/app/business/learn/host/${id}`);
  return ok("The webinar is canceled. Registered members will see it as canceled.");
}

export async function markQuestionAnswered(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const { biz } = await member();
  await biz.from("webinar_questions").update({ answered: true }).eq("id", str(f, "qid", 40));
  revalidatePath(`/app/business/learn/host/${str(f, "id", 40)}`);
  return ok("Marked as answered.");
}

// ─── Owner Portal: review and program settings ─────────────────────
export async function reviewWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner", "moderator"]);
  const decision = str(f, "decision");
  if (!["approved", "changes_requested", "rejected"].includes(decision)) return fail("Choose a decision.");
  if (decision !== "approved" && !str(f, "note")) return fail("Explain what needs to change.");
  if (decision === "approved" && f.get("policy") !== "on") return fail("Confirm the content meets the Knowledge Exchange standards.");
  const supabase = (await createClient())!;
  const id = str(f, "id", 40);
  const { error } = await supabase.schema("business").from("webinars").update({ status: decision, review_note: str(f, "note", 2000) || null }).eq("id", id);
  if (error) return fail("Not saved.");
  await audit(`webinar.${decision}`, "business.webinars", id);
  revalidatePath("/admin/webinars");
  return ok(decision === "approved" ? "Approved and published." : "Sent back to the host.");
}

export async function featureWebinar(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  await supabase.schema("business").from("webinars").update({ is_featured: f.get("on") === "1" }).eq("id", str(f, "id", 40));
  revalidatePath("/admin/webinars");
  return ok("Updated.");
}

export async function setComplimentaryAllowance(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff(["owner"]);
  const n = Number(f.get("allowance"));
  if (!Number.isInteger(n) || n < 0 || n > 50) return fail("Choose a number from 0 to 50.");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("platform_settings").update({ value: n }).eq("key", "complimentary_webinars");
  if (error) return fail("Not saved.");
  await audit("webinar.allowance", "platform_settings", "complimentary_webinars", { value: n });
  revalidatePath("/admin/webinars");
  return ok(`Free members may attend ${n} complimentary webinar${n === 1 ? "" : "s"}.`);
}
