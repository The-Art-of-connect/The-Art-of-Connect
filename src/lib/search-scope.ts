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
  return [...ownerEntries(viewer), ...(viewer ? MEMBER_PAGES : []), ...SITE_PAGES];
}

export const pick = (entries: SearchEntry[], hrefs: string[]) => hrefs.map((h) => entries.find((e) => e.href === h)).filter((e): e is SearchEntry => Boolean(e));
