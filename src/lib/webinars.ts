import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type PublicWebinar = {
  id: string;
  title: string;
  description: string;
  topic: string | null;
  industry: string | null;
  audience: string | null;
  learning_objectives: string[];
  host_display_name: string;
  host_bio: string | null;
  co_hosts: string | null;
  starts_at: string;
  time_zone: string;
  duration_minutes: number;
  access: "standard" | "members_only" | "special_event";
  promo_image_path: string | null;
  logo_path: string | null;
  headshot_path: string | null;
  use_template: string;
  is_featured: boolean;
  provider: string;
  status: string;
  spots_left: number | null;
};

/** Approved webinars only — no private links. */
export const getPublicWebinars = cache(async (): Promise<PublicWebinar[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.schema("business").rpc("public_webinars", { one: null });
  return error || !Array.isArray(data) ? [] : (data as PublicWebinar[]);
});

export const getPublicWebinar = cache(async (id: string): Promise<PublicWebinar | null> => {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.schema("business").rpc("public_webinars", { one: id });
  return (Array.isArray(data) && (data[0] as PublicWebinar)) || null;
});

export const mediaUrl = (path: string | null | undefined) =>
  path && env.supabaseUrl ? `${env.supabaseUrl}/storage/v1/object/public/webinar-media/${path}` : null;

export function formatWhen(startsAt: string, tz: string, opts: { withZone?: boolean } = { withZone: true }) {
  const d = new Date(startsAt);
  let zone = tz;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    zone = "America/Chicago";
  }
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", timeZoneName: opts.withZone ? "short" : undefined }).format(d);
  return { date, time };
}

export const publicWebinarUrl = (id: string, ref?: string) => `${env.siteUrl.replace(/\/$/, "")}/webinars/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

export const isLiveWindow = (w: { starts_at: string; duration_minutes: number }) => {
  const start = new Date(w.starts_at).getTime();
  return Date.now() >= start - 15 * 60_000 && Date.now() <= start + w.duration_minutes * 60_000;
};
