import "server-only";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { getJourneyStatus } from "@/lib/journey-server";

export type NavState = { signedIn: boolean; staff: boolean; paid: boolean; credits: number | null; name: string | null; experiences: string[] };

/** What the navigation needs to reflect membership permissions (never member data beyond the viewer's own). */
export async function getNavState(): Promise<NavState> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || isInsidePreview(viewer)) return { signedIn: Boolean(viewer), staff: false, paid: false, credits: null, name: viewer?.displayName ?? null, experiences: viewer?.experiences ?? [] };
  const status = await getJourneyStatus().catch(() => null);
  const paid = status?.access === "standard" || status?.access === "enhanced";
  const credits = paid && status?.allowance ? status.allowance.remaining + status.allowance.purchasedRemaining : null;
  return { signedIn: true, staff: isStaff(viewer), paid, credits, name: viewer.displayName, experiences: isStaff(viewer) ? ["business", "counseling", "relationships"] : viewer.experiences };
}
