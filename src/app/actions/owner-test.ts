"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { audit } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_TEST_COOKIE, OWNER_TEST_HOURS, signOwnerTestSession } from "@/lib/owner-test-session";
import type { ActionResult } from "@/app/actions/admin";

/** A display-only companion cookie so every page can show the testing banner (it grants nothing by itself). */
const BANNER_COOKIE = "aoc_owner_test_on";

/** Starts a private owner testing session in this browser: owner role and two-step verification required. */
export async function startOwnerTestSession(_p: ActionResult, _f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"]) || viewer.viewAs) return { ok: false, message: "Only the owner can start a testing session." };
  if (!(await getMfaStatus()).verified) return { ok: false, message: "Please complete two-step verification first." };
  const signed = signOwnerTestSession(viewer.id);
  if (!signed) return { ok: false, message: "The testing session couldn't be started (server key missing)." };
  const jar = await cookies();
  const base = { path: "/", sameSite: "lax" as const, secure: true, expires: signed.expires };
  jar.set(OWNER_TEST_COOKIE, signed.value, { ...base, httpOnly: true });
  jar.set(BANNER_COOKIE, String(signed.expires.getTime()), { ...base, httpOnly: false });
  await audit("owner_test_session.start", "settings", "owner_test", { hours: OWNER_TEST_HOURS });
  revalidatePath("/", "layout");
  return { ok: true, message: `Testing session started in this browser for ${OWNER_TEST_HOURS} hours. Open the homepage and test as a customer would.` };
}

export async function endOwnerTestSession() {
  const jar = await cookies();
  jar.delete(OWNER_TEST_COOKIE);
  jar.delete(BANNER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Permanently deletes every fictional test account (and, through the database, everything they created).
 * Owner and two-step verification required. Real members are never touched: only accounts flagged is_test.
 */
export async function removeTestAccounts(_p: ActionResult, f: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, ["owner"]) || viewer.viewAs) return { ok: false, message: "Only the owner can remove test accounts." };
  if (!(await getMfaStatus()).verified) return { ok: false, message: "Please complete two-step verification first." };
  if (String(f.get("confirm") ?? "").trim().toUpperCase() !== "REMOVE") return { ok: false, message: "Type REMOVE to confirm." };
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Not available right now." };
  const { data } = await db.from("profiles").select("id").eq("is_test", true).limit(500);
  let removed = 0;
  for (const p of data ?? []) {
    const { error } = await db.auth.admin.deleteUser(p.id);
    if (!error) removed++;
  }
  await db.from("test_signups").delete().neq("email", "");
  await audit("owner_test_accounts.removed", "profiles", "is_test", { removed });
  revalidatePath("/admin/qa");
  return { ok: true, message: `${removed} test account${removed === 1 ? "" : "s"} removed.` };
}
