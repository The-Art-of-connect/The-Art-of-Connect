"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OPPORTUNITY_KINDS } from "@/lib/radar";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Owner Portal → Opportunity Radar (directive 32). Only the owner enters opportunities, each from its official source; the
 * database refuses anyone else. Nothing is generated: every listing is typed in by the owner after checking the source.
 */
const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

async function owner() {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"]) || !(await getMfaStatus()).verified) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

export async function createOpportunity(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return fail("Only the owner adds Opportunity Radar listings.");
  const title = str(f, "title", 200), organization = str(f, "organization", 200), category = str(f, "category", 20), summary = str(f, "summary", 2000);
  const url = str(f, "official_url", 1000), deadline = str(f, "deadline", 10), verified = str(f, "verified_on", 10);
  if (title.length < 3 || organization.length < 2) return fail("Enter the title and the organization offering it.");
  if (!(category in OPPORTUNITY_KINDS)) return fail("Choose a category.");
  if (summary.length < 10) return fail("Summarize the opportunity in a sentence or two, from the official source.");
  if (!/^https:\/\/\S+$/.test(url)) return fail("Add the official source link (https://).");
  if (f.get("confirm") !== "on") return fail("Tick the box to confirm you checked the official source.");
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const industries = [...new Set(f.getAll("industries").map(String).filter((s) => /^[a-z0-9-]{2,60}$/.test(s)))].slice(0, 20);
  const { error } = await o.db.from("radar_opportunities").insert({
    title, organization, category, summary, official_url: url, industries, region: str(f, "region", 120) || null,
    requirements: str(f, "requirements", 4000) || null, deadline: date(deadline), verified_on: date(verified) ?? new Date().toISOString().slice(0, 10),
    status: f.get("publish") === "on" ? "published" : "draft", created_by: o.viewer.id,
  });
  if (error) return fail("That listing couldn't be saved. Check the fields and try again.");
  revalidatePath("/admin/radar"); revalidatePath("/app/connect360/radar");
  return done(f.get("publish") === "on" ? "Published. Members who turned on matching will see it if it fits their interests." : "Saved as a draft. Members can't see it until you publish it.");
}

export async function setOpportunityStatus(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return fail("Only the owner changes Opportunity Radar listings.");
  const id = z.string().uuid().safeParse(f.get("id"));
  const status = z.enum(["draft", "published", "closed"]).safeParse(f.get("status"));
  if (!id.success || !status.success) return fail("Not found.");
  const { error } = await o.db.from("radar_opportunities").update({ status: status.data }).eq("id", id.data);
  if (error) return fail("That couldn't be updated.");
  revalidatePath("/admin/radar"); revalidatePath("/app/connect360/radar");
  return done(status.data === "published" ? "Published." : status.data === "closed" ? "Closed. Members no longer see it; applications that link to it keep their record." : "Moved back to draft.");
}
