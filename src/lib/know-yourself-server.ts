import "server-only";
import { createClient } from "@/lib/supabase/server";

/** How many of the four reflections this member has written (their own rows only). */
export async function reflectionsWritten(userId: string) {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase.from("self_discovery").select("area, will_do, wont_do").eq("user_id", userId);
  return (data ?? []).filter((r) => r.will_do || r.wont_do).length;
}
