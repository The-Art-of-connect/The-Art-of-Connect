import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Feature = { key: string; name: string; description: string; guest: boolean; free: boolean; premium: boolean; status: string };
export type ExploreData = {
  industries: { slug: string; name: string }[];
  categories: { slug: string; name: string; description: string }[];
  features: Feature[];
  profiles: { name: string | null; industry: string | null; city: string | null; state: string | null; headline: string | null; help_offered: string[]; mentorship: boolean }[];
  resources: { title: string; summary: string; url: string | null }[];
};
const EMPTY: ExploreData = { industries: [], categories: [], features: [], profiles: [], resources: [] };

/** Public Professional Society data: reference lists, feature statuses and consented profiles only. */
export const getExplore = cache(async (): Promise<ExploreData> => {
  const supabase = await createClient();
  if (!supabase) return EMPTY;
  const { data, error } = await supabase.schema("business").rpc("public_explore");
  return error || !data ? EMPTY : { ...EMPTY, ...(data as ExploreData) };
});

export const isOperational = (status: string) => status === "available_now" || status === "growing_community";
