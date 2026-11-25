"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { clientMeta } from "@/lib/security";
import type { ActionResult } from "@/app/actions/admin";

/**
 * Legal & Policy Center actions. Owner and executive management prepare
 * drafts and request reviews; only the owner records attorney approval,
 * approves, schedules and publishes. The database enforces the same rules
 * (and keeps an audit trail) independently of these checks.
 */
const EDITORS = ["owner", "executive"] as const;
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const dbError = (e: { message?: string } | null) =>
  e?.message && /owner|attorney|cannot|future|archived|drafts/i.test(e.message) ? e.message : "Not saved.";

function refresh(slug?: string) {
  revalidatePath("/admin/legal");
  if (slug) revalidatePath(`/admin/legal/${slug}`);
  revalidatePath("/legal", "layout");
}

export async function saveLegalDraft(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const parsed = z
    .object({
      id: z.uuid(),
      slug: z.string().max(60),
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().max(400),
      versionLabel: z.string().trim().regex(/^[A-Za-z0-9._-]{1,40}$/, "Version label: letters, numbers, dots or dashes."),
      body: z.string().min(1, "The document can’t be empty.").max(250000),
      changeSummary: z.string().trim().max(2000),
      effectiveDate: z.union([z.literal(""), z.iso.date()]),
    })
    .safeParse({
      id: f.get("id"), slug: str(f, "slug"), title: str(f, "title"), summary: str(f, "summary"), versionLabel: str(f, "versionLabel"),
      body: str(f, "body").replace(/\r\n/g, "\n"), changeSummary: str(f, "changeSummary"), effectiveDate: str(f, "effectiveDate"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const d = parsed.data;
  const supabase = (await createClient())!;
  const { error, count } = await supabase
    .from("legal_document_versions")
    .update(
      { title: d.title, summary: d.summary, version_label: d.versionLabel, body: d.body, change_summary: d.changeSummary || null, effective_date: d.effectiveDate || null, requires_reacceptance: f.get("reaccept") === "on" },
      { count: "exact" },
    )
    .eq("id", d.id)
    .in("status", ["draft", "pending_owner_review", "pending_legal_review"]);
  if (error) return fail(dbError(error));
  if (!count) return fail("Only drafts and versions under review can be edited. Start a new draft instead.");
  refresh(d.slug);
  return ok("Draft saved.");
}

/** Starts a new draft from the latest version of a document. */
export async function newLegalDraft(_p: ActionResult, f: FormData): Promise<ActionResult> {
  await requireStaff([...EDITORS]);
  const slug = str(f, "slug");
  const supabase = (await createClient())!;
  const { data: latest } = await supabase.from("legal_document_versions").select("title, summary, body, version_label").eq("document_slug", slug).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!latest) return fail("Document not found.");
  const { count } = await supabase.from("legal_document_versions").select("id", { count: "exact", head: true }).eq("document_slug", slug);
  const label = `${new Date().toISOString().slice(0, 7)}-draft-${(count ?? 0) + 1}`;
  const { error } = await supabase.from("legal_document_versions").insert({ document_slug: slug, version_label: label, title: latest.title, summary: latest.summary, body: latest.body, change_summary: null });
  if (error) return fail(dbError(error));
  refresh(slug);
  return ok(`New draft ${label} started from ${latest.version_label}.`);
}

const TRANSITIONS = ["submit_owner_review", "send_legal_review", "record_legal_approval", "approve", "schedule", "publish", "archive", "return_to_draft", "delete_draft"] as const;
const OWNER_ONLY = new Set(["record_legal_approval", "approve", "schedule", "publish", "archive", "delete_draft"]);

export async function legalWorkflow(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const action = str(f, "action") as (typeof TRANSITIONS)[number];
  if (!TRANSITIONS.includes(action)) return fail("Unknown action.");
  const viewer = await requireStaff(OWNER_ONLY.has(action) ? ["owner"] : [...EDITORS]);
  const id = z.uuid().safeParse(f.get("id"));
  if (!id.success) return fail("Invalid version.");
  const slug = str(f, "slug");
  const supabase = (await createClient())!;
  const update = (patch: Record<string, unknown>) => supabase.from("legal_document_versions").update(patch).eq("id", id.data);
  let res: { error: { message?: string } | null };
  let message = "Updated.";

  switch (action) {
    case "submit_owner_review":
      res = await update({ status: "pending_owner_review" });
      message = "Sent for owner review.";
      break;
    case "send_legal_review": {
      const reviewer = str(f, "reviewer").trim().slice(0, 200);
      if (!reviewer) return fail("Enter the attorney or law firm reviewing this document.");
      res = await update({ status: "pending_legal_review", legal_reviewer: reviewer, legal_review_requested_at: new Date().toISOString() });
      message = `Assigned to ${reviewer} for legal review.`;
      break;
    }
    case "record_legal_approval": {
      const name = str(f, "approvedBy").trim().slice(0, 200);
      if (!name) return fail("Enter the name of the approving attorney.");
      if (f.get("attest") !== "on") return fail("Confirm that a qualified attorney approved this exact version.");
      res = await update({ legal_approved_by_name: name, legal_approved_at: new Date().toISOString(), legal_approval_note: str(f, "note").trim().slice(0, 2000) || null });
      message = `Attorney approval by ${name} recorded.`;
      break;
    }
    case "approve":
      res = await update({ status: "approved" });
      message = "Approved by the owner.";
      break;
    case "schedule": {
      const at = new Date(str(f, "scheduledFor"));
      if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return fail("Choose a future date and time.");
      if (f.get("confirm") !== "on") return fail("Confirm the scheduled publication.");
      res = await update({ status: "scheduled", scheduled_for: at.toISOString(), effective_date: at.toISOString().slice(0, 10) });
      message = `Scheduled to take effect ${at.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`;
      break;
    }
    case "publish":
      if (f.get("confirm") !== "PUBLISH") return fail("Type PUBLISH to confirm.");
      res = await update({ status: "published", effective_date: str(f, "effectiveDate") || null });
      message = "Published. The previous version was archived.";
      break;
    case "archive":
      res = await update({ status: "archived" });
      message = "Archived.";
      break;
    case "return_to_draft":
      res = await update({ status: "draft" });
      message = "Returned to draft.";
      break;
    case "delete_draft":
      res = await supabase.from("legal_document_versions").delete().eq("id", id.data).eq("status", "draft");
      message = "Draft deleted.";
      break;
  }
  if (res.error) return fail(dbError(res.error));
  await audit(`legal.${action}`, "legal_document_versions", id.data, { slug, by: viewer.email });
  refresh(slug);
  return ok(message);
}

export async function updateComplianceItem(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await requireStaff([...EDITORS]);
  const parsed = z
    .object({ key: z.string().max(60), status: z.enum(["open", "in_progress", "resolved", "not_applicable"]), decision: z.string().trim().max(4000), notes: z.string().trim().max(4000) })
    .safeParse({ key: str(f, "key"), status: str(f, "status"), decision: str(f, "decision"), notes: str(f, "notes") });
  if (!parsed.success) return fail("Check the fields.");
  const d = parsed.data;
  const isOwner = viewer.roles.includes("owner");
  const supabase = (await createClient())!;
  const { data: item } = await supabase.from("legal_compliance_items").select("kind").eq("key", d.key).maybeSingle();
  if (!item) return fail("Item not found.");
  // Business and legal decisions are the owner's to make.
  if (item.kind === "decision" && d.status === "resolved" && !isOwner) return fail("Only the owner can record a decision as resolved.");
  if (item.kind === "decision" && d.status === "resolved" && !d.decision) return fail("Record the decision before marking it resolved.");
  const { error } = await supabase
    .from("legal_compliance_items")
    .update({
      status: d.status,
      notes: d.notes || null,
      ...(isOwner ? { owner_decision: d.decision || null, decided_by: d.decision ? viewer.id : null, decided_at: d.decision ? new Date().toISOString() : null } : {}),
    })
    .eq("key", d.key);
  if (error) return fail("Not saved.");
  revalidatePath("/admin/legal/compliance");
  revalidatePath("/admin/legal");
  return ok("Saved.");
}

/** Member-facing: accept updated agreements (re-acceptance). */
export async function acceptUpdatedAgreements(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const slugs = f.getAll("doc").map(String).filter((s) => /^[a-z0-9-]{2,60}$/.test(s));
  if (!slugs.length) return fail("Nothing to accept.");
  if (f.get("agree") !== "on") return fail("Please confirm that you have read and agree to the updated documents.");
  const supabase = await createClient();
  if (!supabase) return fail("Not available.");
  const { ipHash, userAgent } = await clientMeta();
  const { error } = await supabase.rpc("record_legal_acceptance", {
    docs: slugs, ctx: "reacceptance", statement: str(f, "statement").slice(0, 1000) || "I have read and agree to the updated documents.",
    ip_hash: ipHash, user_agent: userAgent,
  });
  if (error) return fail("We couldn’t record your acceptance. Please try again.");
  redirect(str(f, "next").startsWith("/app") ? str(f, "next") : "/app");
}
