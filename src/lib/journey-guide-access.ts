import "server-only";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { getJourneyStatus } from "@/lib/journey-server";
import { getLaunchState } from "@/lib/launch";
import { resolveGuide, loadGuideAnswers } from "@/lib/journey-guide-server";
import { createClient } from "@/lib/supabase/server";
import { qaJourneyTesting } from "@/lib/qa-access";
import type { GuideAccess, GuideModule } from "@/lib/journey-guide";

/** What the Journey buttons should offer this viewer. The server still re-checks everything on every message. */
export async function guideAccess(): Promise<GuideAccess> {
  const viewer = await getViewer();
  if (!viewer || isInsidePreview(viewer)) return { kind: "free" };
  const s = await getJourneyStatus().catch(() => null);
  if (!s) return { kind: "free" };
  if (s.access === "staff") {
    if (!hasRole(viewer, ["owner"])) return { kind: "free" };
    return { kind: "owner", available: s.enabled, reason: s.enabled ? undefined : "Owner: turn on Journey in the Journey Intelligence Center" };
  }
  if (s.access === "none") return { kind: "free" };
  // Directive 49: the fictional QA account tests Journey pre-launch when the owner allows it (the server re-checks every message).
  const live = viewer.viewAs ? true : (await getLaunchState()).payments_live || (await qaJourneyTesting(viewer.id)) === "ok";
  const credits = s.allowance ? s.allowance.remaining + s.allowance.purchasedRemaining : 0;
  return { kind: "paid", credits, available: s.enabled && live, reason: s.enabled && live ? undefined : viewer.viewAs ? "Owner: turn on Journey in the Journey Intelligence Center" : "Opens soon" };
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

/**
 * Why Journey isn't available, worded for whoever is looking. The owner (directly or in View-as)
 * is told exactly which Owner Portal switch is still off; members see the public message.
 */
export async function journeyClosedReason(opts: { voice?: boolean } = {}): Promise<string> {
  const viewer = await getViewer();
  const s = await getJourneyStatus().catch(() => null);
  const owner = Boolean(viewer && (viewer.viewAs || hasRole(viewer, ["owner"])));
  if (!owner) return s?.access === "none" ? "Journey is a benefit of paid memberships." : "Journey opens soon. We'll let you know the moment your conversations can begin.";
  if (viewer?.viewAs && s?.access === "none") return "Owner preview: this membership doesn't include Journey. Choose a paid membership in View as to test it.";
  if (!s?.enabled) return "Owner testing: in Owner Portal → Journey Intelligence Center, turn on “Journey” and “Billable OpenAI usage authorized” (type AUTHORIZE). Members stay blocked while live payments are off.";
  if (opts.voice) return "Owner testing: in Owner Portal → Journey Intelligence Center, enter the voice model and cost under “Voice and Auto-Reload safeguards”, then turn on “Talk to Journey (voice)”.";
  return "Owner testing is ready. If a message is refused, check the readiness checklist in the Journey Intelligence Center.";
}
