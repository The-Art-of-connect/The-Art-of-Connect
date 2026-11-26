"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KINDS, TOPICS } from "@/lib/sanctuary";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Curriculum Studio → My Daily Sanctuary (founder directive 17). Owner and executives prepare content; only the owner
 * approves and publishes (also enforced by the database). Nothing reaches members until it is published.
 */
const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

async function studio(ownerOnly = false) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ownerOnly ? ["owner"] : ["owner", "executive"])) return null;
  if (!(await getMfaStatus()).verified) return null;
  return createClient();
}
const refresh = () => { revalidatePath("/admin/curriculum/sanctuary"); revalidatePath("/app/sanctuary"); revalidatePath("/app/sanctuary/library"); revalidatePath("/app/sanctuary/discover"); };

const optionSchema = z.array(z.object({ key: z.string().regex(/^[a-z0-9_-]{1,20}$/), label: z.string().min(1).max(300), insight: z.string().max(500).optional(), signals: z.array(z.string().regex(/^[a-z-]+:[a-z-]+$/)).max(8).optional() })).min(2).max(6);

export async function saveSanctuaryContent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(); if (!db) return fail("Owner or executive access with two-step verification is required.");
  const kind = z.enum(KINDS.map(([k]) => k) as [string, ...string[]]).safeParse(f.get("kind"));
  if (!kind.success) return fail("Choose a type.");
  const topicRaw = str(f, "topic", 40);
  if (topicRaw && !TOPICS.some(([k]) => k === topicRaw)) return fail("Choose a topic from the list.");
  const body = str(f, "body", 6000);
  if (!body) return fail("The main text is required.");
  let options: unknown = null;
  if (kind.data === "scenario") {
    try {
      const parsed = optionSchema.safeParse(JSON.parse(str(f, "options", 6000) || "[]"));
      if (!parsed.success) return fail("Scenarios need 2 to 6 answer options (see the format shown).");
      options = parsed.data;
    } catch {
      return fail("Answer options must be valid JSON (see the format shown).");
    }
  }
  const publishOn = str(f, "publish_on", 10);
  const course = str(f, "course", 60);
  const row = {
    kind: kind.data, topic: topicRaw || null, title: str(f, "title", 160) || null, body,
    example: str(f, "example", 3000) || null, reflection: str(f, "reflection", 1000) || null, activity: str(f, "activity", 1500) || null,
    options, course: /^[a-z0-9-]{2,60}$/.test(course) ? course : null, course_order: Number(f.get("course_order")) || null,
    publish_on: /^\d{4}-\d{2}-\d{2}$/.test(publishOn) ? publishOn : null,
  };
  const id = z.string().uuid().safeParse(f.get("id"));
  const { error } = id.success
    ? await db.from("sanctuary_content").update(row).eq("id", id.data)
    : await db.from("sanctuary_content").insert({ ...row, prepared_by: "owner" });
  if (error) return fail(error.message.includes("Only the owner") ? error.message : "That couldn't be saved.");
  refresh();
  return done(id.success ? "Saved." : "Added as a draft. Approve and publish it when ready.");
}

export async function setSanctuaryStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const status = z.enum(["draft", "approved", "published", "archived"]).safeParse(f.get("status"));
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!status.success || !id.success) return fail("Not found.");
  const db = await studio(status.data === "approved" || status.data === "published");
  if (!db) return fail(status.data === "approved" || status.data === "published" ? "Only the owner approves and publishes." : "Not permitted.");
  const { error } = await db.from("sanctuary_content").update({ status: status.data }).eq("id", id.data);
  if (error) return fail("That couldn't be updated.");
  refresh();
  return done(status.data === "published" ? "Published. Members see it on its scheduled day (or in the daily rotation)." : `Marked ${status.data}.`);
}

/** The owner's one-step approval of every draft of a given type (or all types). */
export async function publishDrafts(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(true); if (!db) return fail("Only the owner approves and publishes.");
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm you have reviewed these drafts.");
  const kind = str(f, "kind", 20);
  let q = db.from("sanctuary_content").update({ status: "published" }).eq("status", "draft");
  if (kind && kind !== "all") q = q.eq("kind", kind);
  const { data, error } = await q.select("id");
  if (error) return fail("They couldn't be published.");
  refresh();
  const n = data?.length ?? 0;
  return done(`${n} draft${n === 1 ? "" : "s"} approved and published.`);
}

export async function deleteSanctuaryContent(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(); if (!db) return fail("Not permitted.");
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Not found.");
  const { error } = await db.from("sanctuary_content").delete().eq("id", id.data).neq("status", "published");
  if (error) return fail("That couldn't be removed.");
  refresh();
  return done("Removed. (Published content is archived instead of deleted.)");
}

// ─── What's Happening Inside Connect: owner-approved previews of genuine activity ───────────
const PREVIEW_KINDS = ["event", "discussion", "circle", "webinar", "business-topic", "travel", "singles", "couples", "friendship", "elite"] as const;

/** A preview must point to a real record (or an official Art of Connect item) and contain no member names or private content. */
export async function savePreview(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(); if (!db) return fail("Owner or executive access with two-step verification is required.");
  const kind = z.enum(PREVIEW_KINDS).safeParse(f.get("kind"));
  const source = z.enum(["event", "circle", "post", "webinar", "official"]).safeParse(f.get("source_type"));
  const title = str(f, "title", 140), summary = str(f, "summary", 600);
  if (!kind.success || !source.success || title.length < 3 || summary.length < 3) return fail("Choose a type and source, and write a title and summary.");
  const sourceId = str(f, "source_id", 36);
  if (source.data !== "official") {
    if (!/^[0-9a-f-]{36}$/.test(sourceId)) return fail("Paste the ID of the real event, circle, post or webinar this previews.");
    const exists = source.data === "webinar"
      ? (await db.schema("business").from("webinars").select("id").eq("id", sourceId).maybeSingle()).data
      : (await db.from(source.data === "event" ? "social_events" : source.data === "circle" ? "social_circles" : "social_posts").select("id").eq("id", sourceId).maybeSingle()).data;
    if (!exists) return fail("That record doesn't exist. Previews must describe genuine activity.");
  }
  const interests = f.getAll("interests").map(String).filter((x) => /^[a-z_]{2,30}$/.test(x)).slice(0, 8);
  const startsAt = str(f, "starts_at", 30);
  const until = str(f, "show_until", 10);
  const { error } = await db.from("connect_previews").insert({
    kind: kind.data, title, summary, interests, source_type: source.data, source_id: source.data === "official" ? null : sourceId,
    starts_at: startsAt ? new Date(startsAt).toISOString() : null, show_until: /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null,
  });
  if (error) return fail("The preview couldn't be saved.");
  revalidatePath("/admin/social/previews");
  return done("Saved as a draft. Approve it to show free members.");
}

export async function setPreviewStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const db = await studio(); if (!db) return fail("Not permitted.");
  const id = z.string().uuid().safeParse(f.get("id"));
  const status = z.enum(["draft", "approved", "archived"]).safeParse(f.get("status"));
  if (!id.success || !status.success) return fail("Not found.");
  const viewer = await getViewer();
  const { error } = await db.from("connect_previews").update({ status: status.data, ...(status.data === "approved" ? { approved_by: viewer!.id } : {}) }).eq("id", id.data);
  if (error) return fail("That couldn't be updated.");
  revalidatePath("/admin/social/previews");
  revalidatePath("/app/discover");
  return done(status.data === "approved" ? "Approved. Free members can now see this preview." : `Marked ${status.data}.`);
}
