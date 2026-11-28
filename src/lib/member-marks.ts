import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Marks = { distinction: "executive" | "elite" | null; verified: boolean };

/**
 * Membership distinctions and identity verification for members the viewer may already see (founder directive 39).
 * The database decides both from actual entitlements and visibility; members it hides simply have no marks.
 */
export async function memberMarks(db: SupabaseClient, ids: (string | null | undefined)[]): Promise<Record<string, Marks>> {
  const unique = [...new Set(ids.filter(Boolean) as string[])].slice(0, 200);
  if (!unique.length) return {};
  const { data } = await db.rpc("member_marks", { p_ids: unique });
  return Object.fromEntries(((data ?? []) as { user_id: string; distinction: string | null; identity_verified: boolean | null }[])
    .map((r) => [r.user_id, { distinction: r.distinction === "elite" || r.distinction === "executive" ? r.distinction : null, verified: Boolean(r.identity_verified) }]));
}
