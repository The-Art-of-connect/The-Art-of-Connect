import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * During an owner testing session, the email being registered is approved as a fictional test account for one day.
 * The database then allows it while public registration is closed, keeps every age rule, and flags it permanently.
 */
export async function approveTestSignup(email: string, ownerId: string | null) {
  const db = createAdminClient();
  if (!db) return false;
  const { error } = await db.from("test_signups").upsert({ email: email.trim().toLowerCase(), created_by: ownerId, expires_at: new Date(Date.now() + 86_400_000).toISOString() });
  return !error;
}

/** Test-account addresses may receive emails before launch (they belong to the owner's testing). */
export async function isTestAccountEmail(email: string) {
  const db = createAdminClient();
  if (!db) return false;
  const { data } = await db.from("profiles").select("id").eq("email", email.trim().toLowerCase()).eq("is_test", true).maybeSingle();
  if (data) return true;
  const { data: pending } = await db.from("test_signups").select("email").eq("email", email.trim().toLowerCase()).maybeSingle();
  return Boolean(pending);
}
