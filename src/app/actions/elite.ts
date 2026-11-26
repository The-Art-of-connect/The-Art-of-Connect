"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMfaStatus, getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/app/actions/admin";
import { collectAccountData, disconnectAccount, startExpeditedPayment } from "@/lib/elite-verification";
import { ATTESTATIONS, SCREENING } from "@/lib/elite-screening";

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const QUALS = ["personal_income", "business_owner", "executive", "net_worth", "investor", "professional", "retiree"];
const EVIDENCE = ["identity", "business_registration", "business_financials", "employment", "license", "financial_verification", "accomplishment", "other"];
const FILE_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function member() {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer) || viewer.viewAs) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}

// ─── Members ──────────────────────────────────────────────────────

/** Private preliminary screening: ranges and categories only. The database decides the result. */
export async function eliteScreen(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in with your own account first.");
  const qualification = String(f.get("qualification") ?? "");
  const pathway = f.get("pathway") === "expedited" ? "expedited" : "earned";
  if (!QUALS.includes(qualification)) return fail("Please choose the pathway that best describes you.");
  const questions = SCREENING[qualification] ?? [];
  const answers: Record<string, string | number> = {};
  for (const q of questions) {
    const v = f.get(`${qualification}__${q.id}`);
    if (v == null || v === "") return fail("Please answer every question for your pathway.");
    answers[q.id] = q.kind === "band" ? Number(v) : String(v);
  }
  for (const a of ATTESTATIONS) answers[a.id] = f.get(a.id) === "on" ? "yes" : "no";
  if (answers.att_truth !== "yes" || answers.att_verify !== "yes") return fail("Please confirm both statements.");
  const { data, error } = await m.db.rpc("elite_screen_v2", { p_qualification: qualification, p_pathway: pathway, p_answers: answers });
  if (error) return fail(error.message.includes("ranges") ? "Please choose from the ranges shown." : "Please try again.");
  revalidatePath("/app/elite/eligibility");
  if (data === "pass") return ok(pathway === "expedited"
    ? "Preliminary eligibility is established. Next, verify your identity; expedited verification then becomes available."
    : "Preliminary eligibility is established. Next, share verification so it can be confirmed privately.");
  if (data === "owner_review") return ok("Thank you. Your answers are with our founder for a personal preliminary review. You'll see the outcome here.");
  if (data === "not_yet") return ok("Thank you. Based on your answers, Elite isn't the right fit today. Your membership journey continues, and you're welcome to revisit this anytime.");
  return ok("Saved.");
}

/** Private verification evidence, stored where only the owner can open it. */
export async function eliteSubmitEvidence(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in first.");
  const kind = String(f.get("kind") ?? "");
  if (!EVIDENCE.includes(kind)) return fail("Please choose what this document verifies.");
  const { data: c } = await m.db.from("elite_candidates").select("id, status").eq("user_id", m.viewer.id).maybeSingle();
  if (!c) return fail("Please complete the preliminary questions first.");
  const file = f.get("file");
  let path: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = FILE_TYPES[file.type];
    if (!ext || file.size > 10 * 1024 * 1024) return fail("Please upload a PDF or image under 10 MB.");
    path = `elite/${c.id}/${randomUUID()}.${ext}`;
    const { error } = await m.db.storage.from("elite-evidence").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return fail("The document couldn't be uploaded. Please try again.");
  }
  const description = String(f.get("description") ?? "").trim().slice(0, 1000) || null;
  if (!path && !description) return fail("Please upload a document or describe what can be verified.");
  const { error } = await m.db.from("elite_evidence").insert({ candidate_id: c.id, kind, storage_path: path, description });
  if (error) return fail("Not saved. Please try again.");
  // Documents always need the founder's review; this routes the candidacy to manual review with reasons.
  await createAdminClient()?.rpc("elite_auto_assess", { p_user: m.viewer.id });
  revalidatePath("/app/elite/eligibility");
  return ok("Received privately. It will be reviewed confidentially. Only verification results are kept wherever possible.");
}

export async function eliteAcceptInvitation(_p: ActionResult, _f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in first.");
  const { data } = await m.db.rpc("elite_accept_invitation");
  revalidatePath("/app/elite/eligibility");
  if (data === "accepted") return ok("Welcome. Your invitation is accepted. When you're ready, choose Elite Concierge in Membership & billing. Nothing is charged until you confirm checkout.");
  if (data === "expired") return fail("This invitation has expired. You may request a review.");
  return fail("There's no invitation to accept yet.");
}

export async function eliteAppeal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in first.");
  const message = String(f.get("message") ?? "").trim().slice(0, 4000);
  if (!message) return fail("Please share what you'd like reviewed.");
  const { data: c } = await m.db.from("elite_candidates").select("id").eq("user_id", m.viewer.id).maybeSingle();
  if (!c) return fail("There's nothing to review yet.");
  const { error } = await m.db.from("elite_appeals").insert({ candidate_id: c.id, message });
  if (error) return fail("Please try again.");
  revalidatePath("/app/elite/eligibility");
  return ok("Your request is with our founder for a personal review.");
}

/** A member asks for a copy of, or a correction to, their own verification information. */
export async function eliteDataRequest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in first.");
  const kind = f.get("kind") === "correction" ? "correction" : "access";
  const subject = String(f.get("subject") ?? "other");
  const message = String(f.get("message") ?? "").trim().slice(0, 4000);
  if (!["identity", "bank", "evidence", "status", "other"].includes(subject)) return fail("Choose what this is about.");
  if (!message) return fail(kind === "correction" ? "Please describe what's inaccurate and what it should say." : "Please describe what you'd like to receive.");
  const { error } = await m.db.from("elite_data_requests").insert({ user_id: m.viewer.id, kind, subject, message });
  if (error) return fail("Please try again.");
  revalidatePath("/app/elite/eligibility");
  return ok(kind === "correction" ? "Your correction request is with our founder. You'll see the response here." : "Your request is with our founder. You'll see the response here.");
}

/** Withdraw bank-data consent: disconnects at Stripe and erases the stored summaries. */
export async function eliteDisconnectBank(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const m = await member(); if (!m) return fail("Please sign in first.");
  const okd = await disconnectAccount(String(f.get("id") ?? ""), m.viewer.id);
  revalidatePath("/app/elite/eligibility");
  return okd ? ok("Disconnected. The financial summaries from this account were erased.") : fail("Not found.");
}

// ─── Owner ────────────────────────────────────────────────────────

async function owner() {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"]) || viewer.viewAs) return null;
  if (!(await getMfaStatus()).verified) return null;
  const db = await createClient();
  return db ? { viewer, db } : null;
}
const NO = fail("Only the owner can do this, with two-step verification.");

export async function eliteSaveSettings(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const num = (k: string) => Math.max(0, Math.round(Number(String(f.get(k) ?? "").replace(/[$,\s]/g, "")) || 0));
  const thresholds = Object.fromEntries(["personal_income", "business_revenue", "net_worth", "investable_assets"].map((k) => [k, { amount: num(`t_${k}`), approved: f.get(`a_${k}`) === "on" }]));
  const feeActive = f.get("fee_active") === "on";
  if (feeActive && String(f.get("fee_confirm") ?? "").trim().toUpperCase() !== "APPROVE") return fail("Type APPROVE to activate the expedited verification fee.");
  const row = {
    tagline: String(f.get("tagline") ?? "").trim().slice(0, 120) || "Distinction. Intention. Influence.",
    thresholds, require_identity: true,
    min_membership_months: Math.min(60, num("min_months")), min_discovery_answers: Math.min(500, num("min_answers")),
    progression_approved: f.get("progression_approved") === "on",
    expedited_fee_cents: Math.round(Number(String(f.get("fee") ?? "").replace(/[$,\s]/g, "")) * 100) || 0,
    expedited_fee_active: feeActive,
    invitation_days: Math.min(365, Math.max(1, num("invitation_days"))), evidence_retention_days: Math.min(3650, Math.max(1, num("retention_days"))),
    auto_rules: { investable_assets_from_balances: f.get("auto_investable") === "on" },
    max_data_age_days: Math.min(365, Math.max(1, num("max_data_age") || 30)),
    updated_at: new Date().toISOString(), updated_by: o.viewer.id,
  };
  const { error } = await o.db.from("elite_settings").update(row).eq("id", true);
  if (error) return fail("Not saved. Please check the values.");
  await audit("elite.settings", "elite_settings", "settings", { thresholds, fee_active: feeActive, fee_cents: row.expedited_fee_cents, auto_rules: row.auto_rules });
  revalidatePath("/admin/elite");
  return ok("Elite settings saved.");
}

/** Founder's discretionary invitation: an existing member (by email) or someone who isn't a member yet. */
export async function eliteFounderInvite(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const name = String(f.get("name") ?? "").trim().slice(0, 120) || null;
  const reason = String(f.get("reason") ?? "").trim().slice(0, 4000);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email.");
  if (!reason) return fail("Please record your confidential reason for this invitation.");
  const admin = createAdminClient(); if (!admin) return fail("Not available right now.");
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  const row = { pathway: "founder", qualification: "founder_selected", status: "qualification_approved", fee_waived: true, decided_by: o.viewer.id, decided_at: new Date().toISOString() };
  const { data: c, error } = profile
    ? await o.db.from("elite_candidates").upsert({ user_id: profile.id, ...row }, { onConflict: "user_id" }).select("id").single()
    : await o.db.from("elite_candidates").insert({ invitee_email: email, invitee_name: name, ...row }).select("id").single();
  if (error || !c) return fail("The invitation couldn't be recorded. This person may already be a candidate.");
  await o.db.from("elite_owner_notes").insert({ candidate_id: c.id, note: reason, created_by: o.viewer.id });
  let outcome = "Approved. They'll receive the invitation once they're a member with verified identity.";
  if (profile) {
    const { data: r } = await o.db.rpc("elite_evaluate", { p_user: profile.id });
    const res = r as { status?: string; identity?: boolean } | null;
    outcome = res?.status === "invitation_issued" ? "Invitation issued." : `Approved. The invitation issues automatically once identity is verified${res?.identity ? "" : " (not yet verified)"}.`;
  }
  await audit("elite.founder_invitation", "elite_candidates", c.id, { existing_member: Boolean(profile) });
  revalidatePath("/admin/elite");
  return ok(outcome);
}

/** Review one piece of evidence. Only the owner verifies; nothing unverified is ever labeled verified. */
export async function eliteReviewEvidence(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = String(f.get("id") ?? "");
  const status = String(f.get("status") ?? "");
  if (!["owner_verified", "rejected", "needs_info"].includes(status)) return fail("Choose a decision.");
  const { data: s } = await o.db.from("elite_settings").select("evidence_retention_days").maybeSingle();
  const { data: ev, error } = await o.db.from("elite_evidence").update({
    status, reviewer_note: String(f.get("note") ?? "").trim().slice(0, 1000) || null, reviewed_at: new Date().toISOString(),
    delete_after: new Date(Date.now() + (s?.evidence_retention_days ?? 90) * 86_400_000).toISOString(),
  }).eq("id", id).select("candidate_id").single();
  if (error || !ev) return fail("Not saved.");
  const { data: c } = await o.db.from("elite_candidates").select("user_id, status").eq("id", ev.candidate_id).single();
  if (c && status === "needs_info") await o.db.from("elite_candidates").update({ status: "info_required" }).eq("id", ev.candidate_id);
  else if (c && status === "owner_verified" && ["preliminary", "verification_pending", "info_required", "manual_review", "not_started"].includes(c.status)) await o.db.from("elite_candidates").update({ status: "owner_verified" }).eq("id", ev.candidate_id);
  if (c?.user_id) await o.db.rpc("elite_auto_assess", { p_user: c.user_id });
  await audit("elite.evidence_review", "elite_evidence", id, { status });
  revalidatePath("/admin/elite");
  return ok("Saved. Eligibility was re-evaluated.");
}

/** Candidate decisions: approve qualification, waive the fee, issue/revoke, and record a confidential note. */
export async function eliteDecide(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = String(f.get("id") ?? "");
  const action = String(f.get("action") ?? "");
  const note = String(f.get("note") ?? "").trim().slice(0, 4000);
  const { data: c } = await o.db.from("elite_candidates").select("id, user_id, status").eq("id", id).maybeSingle();
  if (!c) return fail("Not found.");
  const patch: Record<string, unknown> =
    action === "approve_screening" ? { screening_meets: true, status: c.status === "manual_review" || c.status === "not_started" ? "preliminary" : c.status, review_reasons: [] }
    : action === "approve" ? { status: "qualification_approved" }
    : action === "manual_review" ? { status: "manual_review" }
    : action === "info" ? { status: "info_required" }
    : action === "waive" ? { fee_waived: true }
    : action === "revoke" ? { status: "revoked" }
    : action === "reinstate" ? { status: "qualification_approved" }
    : {};
  if (!Object.keys(patch).length && !note) return fail("Choose an action.");
  if ((action === "approve" || action === "revoke") && !note) return fail("Please record a confidential reason.");
  if (Object.keys(patch).length) {
    const { error } = await o.db.from("elite_candidates").update(patch).eq("id", id);
    if (error) return fail("Not saved.");
  }
  if (action === "revoke" && c.user_id) await o.db.from("elite_badges").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("user_id", c.user_id);
  if (note) await o.db.from("elite_owner_notes").insert({ candidate_id: id, note, created_by: o.viewer.id });
  if (c.user_id && action !== "revoke") await o.db.rpc("elite_evaluate", { p_user: c.user_id });
  await audit(`elite.${action || "note"}`, "elite_candidates", id, {});
  revalidatePath("/admin/elite");
  return ok("Saved.");
}

export async function eliteBadge(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const userId = String(f.get("user_id") ?? "");
  const status = String(f.get("status") ?? "");
  if (!["active", "suspended", "revoked"].includes(status)) return fail("Choose a badge status.");
  const { data: c } = await o.db.from("elite_candidates").select("status").eq("user_id", userId).maybeSingle();
  if (status === "active" && c?.status !== "membership_activated") return fail("A badge can only be active for an activated Elite membership.");
  const { error } = await o.db.from("elite_badges").upsert({ user_id: userId, status, updated_at: new Date().toISOString() });
  if (error) return fail("Not saved.");
  await audit(`elite.badge_${status}`, "elite_badges", userId, {});
  revalidatePath("/admin/elite");
  return ok(`Badge ${status}.`);
}

export async function eliteDecideAppeal(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = String(f.get("id") ?? "");
  const status = f.get("status") === "upheld" ? "upheld" : "denied";
  const { error } = await o.db.from("elite_appeals").update({ status, response: String(f.get("response") ?? "").trim().slice(0, 4000) || null, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail("Not saved.");
  await audit("elite.appeal", "elite_appeals", id, { status });
  revalidatePath("/admin/elite");
  return ok(`Appeal ${status}.`);
}

/** Re-reads Stripe's latest results for one linked account, or erases its financial summaries. */
export async function eliteFinancialAction(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = String(f.get("id") ?? "");
  const admin = createAdminClient(); if (!admin) return fail("Not available.");
  const { data: a } = await admin.from("elite_financial_accounts").select("id, stripe_account_id").eq("id", id).maybeSingle();
  if (!a) return fail("Not found.");
  if (f.get("op") === "purge") {
    await disconnectAccount(a.id, null);
    await audit("elite.financial_purge", "elite_financial_accounts", a.id, {});
    revalidatePath("/admin/elite");
    return ok("Disconnected and financial summaries erased.");
  }
  try { await collectAccountData(a.stripe_account_id); } catch { return fail("Stripe didn't respond. Try again shortly."); }
  await audit("elite.financial_refresh", "elite_financial_accounts", a.id, {});
  revalidatePath("/admin/elite");
  return ok("Refreshed from Stripe.");
}

/** Production Financial Connections: on only after Stripe approves our Authorized Purpose, with typed approval. */
export async function eliteSaveStripeVerification(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const purpose = f.get("purpose_approved") === "on";
  const live = f.get("fc_live") === "on";
  if (live && !purpose) return fail("Production bank verification needs Stripe's approval of our Authorized Purpose first.");
  const { data: cur } = await o.db.from("elite_settings").select("financial_connections_live").maybeSingle();
  if (live && !cur?.financial_connections_live && String(f.get("confirm") ?? "").trim().toUpperCase() !== "APPROVE") return fail("Type APPROVE to turn on production bank verification (Stripe bills each use).");
  const { error } = await o.db.from("elite_settings").update({ financial_purpose_approved: purpose, financial_connections_live: live, updated_at: new Date().toISOString(), updated_by: o.viewer.id }).eq("id", true);
  if (error) return fail("Not saved.");
  await audit("elite.stripe_verification", "elite_settings", "settings", { purpose_approved: purpose, financial_connections_live: live });
  revalidatePath("/admin/elite/verification");
  return ok(live ? "Production bank verification is on." : "Saved. Production bank verification is off; Sandbox testing remains available.");
}

/** The owner completes or declines a member's access or correction request. */
export async function eliteResolveDataRequest(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const o = await owner(); if (!o) return NO;
  const id = String(f.get("id") ?? "");
  const status = f.get("status") === "declined" ? "declined" : "completed";
  const response = String(f.get("response") ?? "").trim().slice(0, 4000);
  if (!response) return fail("Please write a response to the member.");
  const { error } = await o.db.from("elite_data_requests").update({ status, response, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail("Not saved.");
  await audit("elite.data_request", "elite_data_requests", id, { status });
  revalidatePath("/admin/elite");
  return ok(`Request ${status}.`);
}
