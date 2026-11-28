import "server-only";
import { balanceLabel } from "@/lib/journey-budget";
import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { getJourneyStatus } from "@/lib/journey-server";

export type NavState = { signedIn: boolean; staff: boolean; paid: boolean; credits: number | null; balance?: string | null; name: string | null; experiences: string[] };

/** What the navigation needs to reflect membership permissions (never member data beyond the viewer's own). */
export async function getNavState(): Promise<NavState> {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || isInsidePreview(viewer)) return { signedIn: Boolean(viewer), staff: false, paid: false, credits: null, name: viewer?.displayName ?? null, experiences: viewer?.experiences ?? [] };
  const status = await getJourneyStatus().catch(() => null);
  // Membership access v2: paid = a paid membership or active trial (society access), or Journey access.
  const paid = status?.access === "standard" || status?.access === "enhanced" || viewer.experiences.includes("business") || viewer.experiences.includes("relationships");
  const credits = (status?.access === "standard" || status?.access === "enhanced") && status?.allowance ? status.allowance.remaining + status.allowance.purchasedRemaining : null;
  return { signedIn: true, staff: isStaff(viewer), paid, credits, balance: balanceLabel(status?.allowance), name: viewer.displayName, experiences: isStaff(viewer) ? ["business", "counseling", "relationships"] : viewer.experiences };
}
