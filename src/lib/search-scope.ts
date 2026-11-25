import "server-only";
import { ADMIN_SECTIONS } from "@/lib/admin";
import type { Viewer } from "@/lib/auth";
import { MEMBER_PAGES, SITE_PAGES, type SearchEntry } from "@/lib/search-index";

/** Owner Portal sections this team member is allowed to open. */
export function ownerEntries(viewer: Viewer | null): SearchEntry[] {
  if (!viewer?.roles.length) return [];
  return ADMIN_SECTIONS.filter((s) => s.roles.some((r) => viewer.roles.includes(r))).map((s) => ({
    href: s.href, title: s.label, section: `Owner Portal · ${s.group}`, summary: `Owner Portal — ${s.group}`, keywords: `owner portal admin ${s.group}`, area: "owner" as const,
  }));
}

/** Everything this person may search: the website, plus the member area when signed in, plus their Owner Portal sections. */
export function entriesFor(viewer: Viewer | null): SearchEntry[] {
  const owner = viewer?.viewAs ? [] : ownerEntries(viewer);
  return [...owner, ...(viewer ? MEMBER_PAGES.filter((e) => memberMayOpen(viewer, e.href)) : []), ...SITE_PAGES];
}

/** Society pages appear in search only for members whose membership includes them (staff in their own view see all). */
const SOCIETY_PATHS: [string, string][] = [["/app/business", "business"], ["/app/relationships", "relationships"], ["/app/readiness", "relationships"], ["/app/counseling", "counseling"]];
function memberMayOpen(viewer: Viewer, href: string) {
  if (viewer.roles.length && !viewer.viewAs) return true;
  const hit = SOCIETY_PATHS.find(([p]) => href === p || href.startsWith(p + "/") || href.startsWith(p + "#"));
  return !hit || viewer.experiences.includes(hit[1] as never);
}

export const pick = (entries: SearchEntry[], hrefs: string[]) => hrefs.map((h) => entries.find((e) => e.href === h)).filter((e): e is SearchEntry => Boolean(e));
