import type { NavLink } from "@/lib/nav";
import type { NavState } from "@/lib/nav-state";

/** Visitors are taken to sign in first for member pages; members go straight there. */
export const linkFor = (l: NavLink, s: NavState) =>
  l.access && l.access !== "public" && !s.signedIn ? `/sign-in?next=${encodeURIComponent(l.href)}` : l.href;

export const badgeFor = (l: NavLink, s: NavState) =>
  l.access === "paid" ? (s.paid ? "Included" : "Paid membership") : l.access === "member" && !s.signedIn ? "Members" : null;
