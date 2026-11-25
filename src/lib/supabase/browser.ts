"use client";
import { createBrowserClient } from "@supabase/ssr";
import { validUrl } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    validUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
