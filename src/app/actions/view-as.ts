"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMfaStatus, getViewer, hasRole } from "@/lib/auth";
import { isPersona, VIEW_AS_COOKIE } from "@/lib/view-as";

/** Owner only (with two-step verification): view the member area as a membership persona, or return to the owner's own view. */
export async function setViewAs(f: FormData) {
  const viewer = await getViewer();
  if (!hasRole(viewer, ["owner"]) || !(await getMfaStatus()).verified) redirect("/admin/forbidden");
  const persona = String(f.get("persona") ?? "");
  const jar = await cookies();
  if (isPersona(persona)) jar.set(VIEW_AS_COOKIE, persona, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  else jar.delete(VIEW_AS_COOKIE);
  redirect(String(f.get("next") ?? "/app").startsWith("/") ? String(f.get("next") ?? "/app") : "/app");
}
