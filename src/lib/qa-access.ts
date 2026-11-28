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
