import "server-only";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type LinkKind = "recovery" | "invite";

/**
 * Creates a one-time account link with the server key, without Supabase
 * sending any email. The link points to our own confirmation page, which
 * asks the person to press "Continue" — so email security scanners that
 * open links automatically can't use it up first.
 */
export async function createAccountLink(email: string, kind: LinkKind): Promise<{ link: string; userId: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.generateLink({ type: kind, email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed || !data.user) return null;
  const type = kind === "invite" ? "invite" : "recovery";
  return { link: `${env.siteUrl.replace(/\/$/, "")}/confirm-link?type=${type}&token_hash=${encodeURIComponent(hashed)}`, userId: data.user.id };
}
