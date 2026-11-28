import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Experience, StaffRole } from "@/lib/experiences";
import { isQaAccount } from "@/lib/qa-access";
import { getLaunchState } from "@/lib/launch";
import { env } from "@/lib/env";
import { cookies, headers } from "next/headers";
import { isPersona, PERSONAS, VIEW_AS_COOKIE, type Society } from "@/lib/view-as";
import { INSIDE_PREVIEW_COOKIE, INSIDE_PREVIEW_ENABLED, ANONYMOUS_PREVIEW_ENABLED, INSIDE_PREVIEW_ID } from "@/lib/inside-preview";

/** Temporary read-only preview viewer: no account, no session, no data. */
async function previewViewer(): Promise<Viewer | null> {
  if (!INSIDE_PREVIEW_ENABLED || !ANONYMOUS_PREVIEW_ENABLED) return null;
  if ((await cookies()).get(INSIDE_PREVIEW_COOKIE)?.value !== "1") return null;
  if ((await headers()).get("next-action")) return null; // never for server actions
  return {
    id: INSIDE_PREVIEW_ID, email: "", displayName: "Preview", roles: [], accountType: "member", ageEligible: true, referralCode: null,
    experiences: ["business", "counseling", "relationships"],
  };
}
export const isInsidePreview = (v: Viewer | null) => v?.id === INSIDE_PREVIEW_ID;

export type Viewer = {
  id: string;
  email: string;
  displayName: string | null;
  roles: StaffRole[];
  experiences: Experience[];
  accountType: "member" | "professional" | "staff";
  ageEligible: boolean;
  referralCode: string | null;
  /** Owner-only "View as" persona: the owner is seeing the site as this membership. */
  viewAs?: string | null;
  society?: Society | null;
};

/** The signed-in user with their staff roles and experience grants, or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  if (!supabase) return previewViewer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return previewViewer();

  const [{ data: profile }, { data: roles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("display_name, status, account_type, age_eligible, referral_code, primary_society").eq("id", auth.user.id).maybeSingle(),
    supabase.from("staff_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("experience_access").select("experience, status, expires_at, source").eq("user_id", auth.user.id),
  ]);
  if (profile?.status && profile.status !== "active") return null;

  const now = Date.now();
  const roleList = (roles ?? []).map((r) => r.role as StaffRole);
  // Owner-only "View as": only an owner with a verified second factor can apply a persona.
  const persona = roleList.includes("owner") ? (await cookies()).get(VIEW_AS_COOKIE)?.value : undefined;
  if (persona && isPersona(persona)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      return {
        id: auth.user.id, email: auth.user.email ?? "", displayName: profile?.display_name ?? null, accountType: "member",
        ageEligible: true, referralCode: profile?.referral_code ?? null, roles: roleList,
        experiences: PERSONAS[persona].experiences, viewAs: persona, society: PERSONAS[persona].society,
      };
    }
  }
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    displayName: profile?.display_name ?? null,
    accountType: (profile?.account_type as Viewer["accountType"]) ?? "member",
    ageEligible: Boolean(profile?.age_eligible),
    referralCode: profile?.referral_code ?? null,
    roles: roleList,
    society: (profile?.primary_society as Society | null) ?? null,
    // Membership access v2: The Art of Becoming (counseling) is complimentary for every account. Other experiences come
    // only from a paid membership, active trial, comp or owner grant (the retired free tier never counts).
    experiences: [...new Set<Experience>(["counseling", ...(access ?? [])
      .filter((a) => a.status === "active" && a.source !== "free_tier" && (!a.expires_at || new Date(a.expires_at).getTime() > now))
      .map((a) => a.experience as Experience)])],
  };
});

/** Staff powers on member pages. Switched off while the owner is viewing as a member persona. */
export const isStaff = (v: Viewer | null) => Boolean(v && v.roles.length > 0 && !v.viewAs);
export const hasRole = (v: Viewer | null, roles: StaffRole[]) => Boolean(v && v.roles.some((r) => roles.includes(r)));

/** Multi-factor status of the current session (Supabase assurance levels). */
export const getMfaStatus = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { verified: false, enrolled: false };
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { verified: data?.currentLevel === "aal2", enrolled: data?.nextLevel === "aal2" };
});

/**
 * Guard for every Owner Portal page and action. Staff must complete MFA:
 * without an authenticator they are sent to set one up; with one, they must
 * enter a code. (The database independently refuses staff permissions to
 * sessions without MFA.)
 */
export async function requireStaff(roles: StaffRole[] = ["owner", "admin", "support", "moderator", "finance"]) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/admin");
  if (!hasRole(viewer, roles)) redirect("/admin/forbidden");
  const mfa = await getMfaStatus();
  if (!mfa.verified) redirect(mfa.enrolled ? "/mfa/verify?next=/admin" : "/mfa/setup");
  return viewer;
}

/** The member page the visitor came from (same site only), so "Maybe later" returns them there. */
async function cameFrom() {
  try {
    const ref = (await headers()).get("referer");
    const u = ref ? new URL(ref) : null;
    return u && u.host === new URL(env.siteUrl).host && u.pathname.startsWith("/app") && !u.pathname.startsWith("/app/unlock") ? u.pathname : "/app";
  } catch { return "/app"; }
}

/** Guard for member experience pages: signed in, granted, and launched (staff may preview). */
export async function requireExperience(experience: Experience) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=/app/${experience}`);
  const launch = await getLaunchState();
  const granted = viewer.experiences.includes(experience);
  const live = launch[`${experience}_live` as const];
  const staffPreview = isStaff(viewer) || isInsidePreview(viewer);
  // The owner-listed fictional QA account previews experiences that are not open to members yet.
  const qaPreview = granted && !live && !viewer.viewAs && (await isQaAccount(viewer.id));
  // Directive 36: never a silent redirect. Show the membership-aware pop-up for this experience, then return the member.
  if (!staffPreview && !qaPreview && !(granted && live)) redirect(`/app/unlock?need=${experience}&from=${encodeURIComponent(await cameFrom())}`);
  return { viewer, preview: (staffPreview || qaPreview) && !(granted && live) };
}

/** Membership access v2: a paid membership or active trial (Business or In Love access), staff, or an owner preview. */
export const hasPaidAccess = (v: Viewer | null) =>
  Boolean(v && (v.experiences.includes("business") || v.experiences.includes("relationships") || isStaff(v)));

/**
 * The social ecosystem and other interactive member features: a paid membership or an active 15-day trial.
 * Free accounts are sent to the invitation page (they can still read about every feature).
 */
export async function requirePaidAccess(feature: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=/app`);
  const preview = isStaff(viewer) || isInsidePreview(viewer);
  if (!preview && !hasPaidAccess(viewer)) redirect(`/app/unlock?need=paid&feature=${encodeURIComponent(feature)}&from=${encodeURIComponent(await cameFrom())}`);
  return { viewer, preview: preview && !hasPaidAccess(viewer) };
}
