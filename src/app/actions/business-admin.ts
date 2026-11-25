"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/admin";

/** Owner Portal — Founding Community & Business Growth Center. */
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string, max = 600) => String(f.get(k) ?? "").trim().slice(0, max);
const STATUSES = ["available_now", "growing_community", "coming_soon", "future_development", "temporarily_unavailable"] as const;
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function biz(roles: ("owner" | "executive" | "moderator")[]) {
  await requireStaff(roles);
  return (await createClient())!.schema("business");
}
const done = (msg: string) => {
  revalidatePath("/admin/business");
  revalidatePath("/business/explore");
  return ok(msg);
};

/** Owner only: feature status, who it is for, and an optional scheduled change. */
export async function saveFeature(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const b = await biz(["owner"]);
  const parsed = z
    .object({ key: z.string().max(60), status: z.enum(STATUSES), scheduledStatus: z.union([z.literal(""), z.enum(STATUSES)]), scheduledAt: z.string().max(40) })
    .safeParse({ key: str(f, "key"), status: str(f, "status"), scheduledStatus: str(f, "scheduledStatus"), scheduledAt: str(f, "scheduledAt") });
  if (!parsed.success) return fail("Check the values.");
  const d = parsed.data;
  const at = d.scheduledStatus && d.scheduledAt ? new Date(d.scheduledAt) : null;
  if (at && (Number.isNaN(at.getTime()) || at.getTime() <= Date.now())) return fail("Choose a future date and time for the scheduled change.");
  const { error } = await b.from("features").update({
    status: d.status, guest: f.get("guest") === "on", free: f.get("free") === "on", premium: f.get("premium") === "on",
    scheduled_status: at ? d.scheduledStatus : null, scheduled_at: at ? at.toISOString() : null,
    name: str(f, "name", 120) || undefined, description: str(f, "description", 400),
  }).eq("key", d.key);
  if (error) return fail("Not saved.");
  await audit("business.feature", "business.features", d.key, { status: d.status, scheduled: d.scheduledStatus || null });
  return done("Feature updated.");
}

export async function saveReference(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const b = await biz(["owner", "executive"]);
  const table = str(f, "table");
  if (!["industries", "categories"].includes(table)) return fail("Invalid list.");
  const name = str(f, "name", 80);
  const slug = str(f, "slug", 60) || slugify(name);
  if (!name || !slug) return fail("Enter a name.");
  const row: Record<string, unknown> = { slug, name, is_active: f.get("active") !== "off", sort_order: Number(f.get("sort") ?? 500) || 500 };
  if (table === "categories") row.description = str(f, "description", 300);
  const { error } = await b.from(table).upsert(row, { onConflict: "slug" });
  if (error) return fail("Not saved.");
  return done(`${name} saved.`);
}

export async function saveReadinessItem(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const b = await biz(["owner", "executive"]);
  const title = str(f, "title", 160);
  const key = str(f, "key", 60) || slugify(title);
  if (!title) return fail("Enter a title.");
  const { error } = await b.from("readiness_items").upsert({ key, title, description: str(f, "description", 400), area: str(f, "area", 60) || "General", is_active: f.get("active") !== "off", sort_order: Number(f.get("sort") ?? 500) || 500 }, { onConflict: "key" });
  if (error) return fail("Not saved.");
  return done("Checklist updated.");
}

export async function saveResource(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "executive"]);
  const b = (await createClient())!.schema("business");
  const title = str(f, "title", 160);
  const url = str(f, "url", 500);
  if (!title) return fail("Enter a title.");
  if (url && !url.startsWith("https://")) return fail("Links must start with https://");
  const tier = ["guest", "free", "premium"].includes(str(f, "tier")) ? str(f, "tier") : "free";
  const status = ["draft", "published", "archived"].includes(str(f, "status")) ? str(f, "status") : "draft";
  const id = str(f, "id", 40);
  const row = { title, summary: str(f, "summary", 600), url: url || null, tier, status, topics: str(f, "topics").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) };
  const { error } = id ? await b.from("resources").update(row).eq("id", id) : await b.from("resources").insert({ ...row, created_by: viewer.id });
  if (error) return fail("Not saved.");
  return done("Resource saved.");
}

export async function resolveBusinessReport(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["owner", "moderator"]);
  const supabase = (await createClient())!;
  const b = supabase.schema("business");
  const status = str(f, "status");
  if (!["reviewing", "actioned", "dismissed"].includes(status)) return fail("Invalid status.");
  const id = str(f, "id", 40);
  const { error } = await b.from("reports").update({ status, resolved_by: status === "reviewing" ? null : viewer.id, resolved_at: status === "reviewing" ? null : new Date().toISOString() }).eq("id", id);
  if (error) return fail("Not updated.");
  if (f.get("removePost") === "on" && str(f, "postId", 40)) await b.from("posts").update({ status: "removed" }).eq("id", str(f, "postId", 40));
  await audit(`business.report.${status}`, "business.reports", id);
  revalidatePath("/admin/business");
  return ok("Report updated.");
}
