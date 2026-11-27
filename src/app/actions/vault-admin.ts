"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { vaultConfig } from "@/lib/vault-aws";
import { phaseOne, phaseTwo, type Result } from "@/lib/vault-selftest";

/** Owner-only Document Vault administration and security self-test (owner role + two-factor sign-in via requireStaff). */
export type RunView = { id: string; status: string; results: Result[]; startedAt: string; finished: boolean; message?: string };

export async function startVaultSelfTest(): Promise<RunView | { error: string }> {
  const viewer = await requireStaff(["owner"]);
  if (!vaultConfig().ready) return { error: "The vault settings in Netlify are incomplete. See the configuration panel." };
  const db = createAdminClient();
  if (!db) return { error: "The database isn't available." };
  // An unfinished run (for example after the page was reloaded) is resumed rather than started again.
  const { data: running } = await db.from("vault_security_runs").select("id, results, started_at").eq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (running) return { id: running.id, status: "running", results: running.results as Result[], startedAt: running.started_at, finished: false, message: "Resuming the self-test already in progress…" };
  const { objects, results } = await phaseOne();
  const { data: row } = await db.from("vault_security_runs").insert({ started_by: viewer.id, objects, results, status: objects.done ? "failed" : "running", finished_at: objects.done ? new Date().toISOString() : null }).select("id, started_at").single();
  await db.from("audit_log").insert({ actor_id: viewer.id, action: "vault.selftest_started", target_table: "vault_security_runs", target_id: row?.id ?? null, details: { passed: results.filter((x) => x.outcome === "pass").length, total: results.length } });
  revalidatePath("/admin/vault");
  return { id: row!.id, status: objects.done ? "failed" : "running", results, startedAt: row!.started_at, finished: Boolean(objects.done) };
}

/** Called every few seconds by the page until GuardDuty has tagged both test files (or 5 minutes pass). */
export async function continueVaultSelfTest(id: string): Promise<RunView | { error: string }> {
  await requireStaff(["owner"]);
  const db = createAdminClient();
  if (!db) return { error: "The database isn't available." };
  const { data: run } = await db.from("vault_security_runs").select("id, status, objects, results, started_at").eq("id", id).maybeSingle();
  if (!run) return { error: "Unknown run." };
  const prior = run.results as Result[];
  if (run.status !== "running") return { id, status: run.status, results: prior, startedAt: run.started_at, finished: true };
  const waited = Date.now() - Date.parse(run.started_at) > 5 * 60_000;
  const { results, finished } = await phaseTwo(run.objects, waited);
  if (!finished) return { id, status: "running", results: prior, startedAt: run.started_at, finished: false, message: "Waiting for GuardDuty to finish scanning…" };
  const all = [...prior, ...results];
  const failed = all.some((x) => x.outcome === "fail");
  await db.from("vault_security_runs").update({ results: all, status: failed ? "failed" : "complete", finished_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/vault");
  return { id, status: failed ? "failed" : "complete", results: all, startedAt: run.started_at, finished: true };
}

/** Testing storage on or off. There is no production setting. */
export async function setVaultStorage(mode: "off" | "aws_testing"): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireStaff(["owner"]);
  if (mode === "aws_testing" && !vaultConfig().ready) return { ok: false, message: "Complete the vault settings in Netlify first." };
  const db = createAdminClient();
  const { error } = await db!.schema("business").from("suite_settings").update({ vault_storage: mode }).eq("id", true);
  if (error) return { ok: false, message: "That couldn't be saved." };
  await db!.from("audit_log").insert({ actor_id: viewer.id, action: "vault.storage_mode", target_table: "suite_settings", target_id: null, details: { mode } });
  revalidatePath("/admin/vault");
  return { ok: true, message: mode === "aws_testing" ? "Testing storage is on for the owner, staff and test accounts only." : "Testing storage is off." };
}
