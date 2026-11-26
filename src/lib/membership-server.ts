import "server-only";
import { cache } from "react";
import { getViewer, isInsidePreview, isStaff, type Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PERSONAS } from "@/lib/view-as";
import { levelOf, type Level } from "@/lib/membership-level";

/** The viewer's membership level, from their own subscription and Elite badge (row security limits both to the viewer). */
export const getMembership = cache(async (v?: Viewer | null): Promise<{ level: Level; packageSlug: string | null; status: string | null; elite: boolean; experiences: string[] } | null> => {
  const viewer = v === undefined ? await getViewer() : v;
  if (!viewer) return null;
  if (viewer.viewAs) {
    const p = PERSONAS[viewer.viewAs];
    const elite = p?.packageSlug === "elite-concierge";
    return { level: levelOf({ packageSlug: p?.packageSlug ?? null, status: p?.packageSlug ? "active" : null, experiences: viewer.experiences, eliteBadge: elite }), packageSlug: p?.packageSlug ?? null, status: "active", elite, experiences: [...viewer.experiences] };
  }
  if (isInsidePreview(viewer)) return { level: "free", packageSlug: null, status: null, elite: false, experiences: ["counseling"] };
  const db = await createClient();
  if (!db) return null;
  const [{ data: sub }, { data: badge }] = await Promise.all([
    db.from("subscriptions").select("tier_slug, status").eq("user_id", viewer.id).eq("kind", "member").in("status", ["active", "trialing"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const elite = badge?.status === "active";
  const level = isStaff(viewer) ? "elite" : levelOf({ packageSlug: sub?.tier_slug ?? null, status: sub?.status ?? null, experiences: viewer.experiences, eliteBadge: elite });
  return { level, packageSlug: sub?.tier_slug ?? null, status: sub?.status ?? null, elite: elite || isStaff(viewer), experiences: [...viewer.experiences] };
});
