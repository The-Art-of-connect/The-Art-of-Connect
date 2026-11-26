import "server-only";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { getJourneyStatus } from "@/lib/journey-server";
import { getLaunchState } from "@/lib/launch";
import { resolveGuide, loadGuideAnswers } from "@/lib/journey-guide-server";
import { createClient } from "@/lib/supabase/server";
import type { GuideAccess, GuideModule } from "@/lib/journey-guide";

/** What the Journey buttons should offer this viewer. The server still re-checks everything on every message. */
export async function guideAccess(): Promise<GuideAccess> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { kind: "free" };
  const s = await getJourneyStatus().catch(() => null);
  if (!s) return { kind: "free" };
  if (s.access === "staff") {
    if (!hasRole(viewer, ["owner"])) return { kind: "free" };
    return { kind: "owner", available: s.enabled, reason: s.enabled ? undefined : "Owner: turn on Journey to test" };
  }
  if (s.access === "none") return { kind: "free" };
  const live = viewer.viewAs ? true : (await getLaunchState()).payments_live;
  const credits = s.allowance ? s.allowance.remaining + s.allowance.purchasedRemaining : 0;
  return { kind: "paid", credits, available: s.enabled && live, reason: s.enabled && live ? undefined : "Opens soon" };
}

/** Everything a page needs to place the universal Journey options before its questions. */
export async function guideFor(ref: string): Promise<{ mod: GuideModule; access: GuideAccess; hasAnswers: boolean } | null> {
  const supabase = await createClient();
  const mod = await resolveGuide(supabase, ref);
  if (!mod) return null;
  const viewer = await getViewer();
  const [access, answers] = await Promise.all([
    guideAccess(),
    viewer && supabase && !isInsidePreview(viewer) ? loadGuideAnswers(supabase, viewer.id, mod) : Promise.resolve({}),
  ]);
  return { mod, access, hasAnswers: Object.keys(answers).length > 0 };
}
