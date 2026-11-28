import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The owner-listed fictional QA account (Journey's customer audit). It may preview experiences that are not yet open to
 * members, and its complimentary $0 membership counts for Journey within the company's Journey limit. Never a staff account.
 */
export const isQaAccount = cache(async (userId: string | null | undefined): Promise<boolean> => {
  if (!userId) return false;
  const db = createAdminClient();
  if (!db) return false;
  const { data } = await db.rpc("is_qa_account", { uid: userId });
  return data === true;
});

/**
 * Directive 49: the owner-authorized pre-launch Journey testing exception. 'ok' only for the fictional QA account (never
 * staff, never a real member) while the owner's switch is on and the QA testing budget allows `reserveCents` more.
 * It replaces only the "live payments" and "experience opened" switches; membership tier, allowances and company caps still apply.
 */
export async function qaJourneyTesting(userId: string | null | undefined, reserveCents = 0): Promise<string> {
  if (!userId) return "not_qa";
  const db = createAdminClient();
  if (!db) return "off";
  const { data } = await db.rpc("journey_qa_allowed", { p_user: userId, p_reserve: reserveCents });
  return typeof data === "string" ? data : "off";
}
