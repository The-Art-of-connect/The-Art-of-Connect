import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Experience, StaffRole } from "@/lib/experiences";
import { getLaunchState } from "@/lib/launch";

export type Viewer = {
  id: string;
  email: string;
  displayName: string | null;
  roles: StaffRole[];
  experiences: Experience[];
  accountType: "member" | "professional" | "staff";
  ageEligible: boolean;
  referralCode: string | null;
};

/** The signed-in user with their staff roles and experience grants, or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: profile }, { data: roles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("display_name, status, account_type, age_eligible, referral_code").eq("id", auth.user.id).maybeSingle(),
    supabase.from("staff_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("experience_access").select("experience, status, expires_at").eq("user_id", auth.user.id),
  ]);
  if (profile?.status && profile.status !== "active") return null;

  const now = Date.now();
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    displayName: profile?.display_name ?? null,
    accountType: (profile?.account_type as Viewer["accountType"]) ?? "member",
    ageEligible: Boolean(profile?.age_eligible),
    referralCode: profile?.referral_code ?? null,
    roles: (roles ?? []).map((r) => r.role as StaffRole),
    experiences: (access ?? [])
      .filter((a) => a.status === "active" && (!a.expires_at || new Date(a.expires_at).getTime() > now))
      .map((a) => a.experience as Experience),
  };
});

export const isStaff = (v: Viewer | null) => Boolean(v && v.roles.length > 0);
export const hasRole = (v: Viewer | null, roles: StaffRole[]) => Boolean(v && v.roles.some((r) => roles.includes(r)));

/** Guard for every Owner Portal page and action. */
export async function requireStaff(roles: StaffRole[] = ["owner", "admin", "support", "moderator", "finance"]) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/admin");
  if (!hasRole(viewer, roles)) redirect("/admin/forbidden");
  return viewer;
}

/** Guard for member experience pages: signed in, granted, and launched (staff may preview). */
export async function requireExperience(experience: Experience) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=/app/${experience}`);
  const launch = await getLaunchState();
  const granted = viewer.experiences.includes(experience);
  const live = launch[`${experience}_live` as const];
  const staffPreview = isStaff(viewer);
  if (!staffPreview && !(granted && live)) redirect("/app?locked=" + experience);
  return { viewer, preview: staffPreview && !(granted && live) };
}
