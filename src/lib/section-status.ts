import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Paths the owner has marked "Coming soon" in Page reviews: the one source of availability for cards and catalogs. */
export const comingSoonPaths = cache(async (): Promise<string[]> => {
  const sb = await createClient();
  const { data } = (await sb?.from("section_status").select("path").eq("status", "coming_soon")) ?? { data: null };
  return (data ?? []).map((r) => r.path as string);
});
