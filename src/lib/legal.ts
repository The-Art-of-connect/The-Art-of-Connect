import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Legal & Policy Center. Documents and their versions live in the database
 * (Owner Portal → Legal & Policy Center). The public sees only versions in
 * effect; drafts are never exposed. Acceptances are recorded against the
 * exact version in effect.
 */
export type LegalStatus = "draft" | "pending_owner_review" | "pending_legal_review" | "approved" | "scheduled" | "published" | "archived";

export const STATUS_LABEL: Record<LegalStatus, string> = {
  draft: "Draft",
  pending_owner_review: "Pending Owner Review",
  pending_legal_review: "Pending Legal Review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const STATUS_TONE: Record<LegalStatus, string> = {
  draft: "border-line-strong text-muted",
  pending_owner_review: "border-champagne/60 bg-champagne/10 text-gold",
  pending_legal_review: "border-champagne/60 bg-champagne/10 text-gold",
  approved: "border-success/50 bg-success/10 text-success",
  scheduled: "border-success/50 bg-success/10 text-success",
  published: "border-success/60 bg-success/15 text-success",
  archived: "border-line text-faint",
};


export const CATEGORY_LABEL: Record<string, string> = {
  core: "Core terms",
  membership: "Membership & billing",
  safety: "Safety & conduct",
  privacy: "Privacy & data",
  professional: "Professional providers",
  disclaimer: "Disclaimers",
  company: "Company",
};

export type PublicLegalDoc = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  in_effect: boolean;
  version: string | null;
  effective_date: string | null;
  body: string | null;
};

export const getPublicLegal = cache(async (): Promise<PublicLegalDoc[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_public_legal", { doc: null });
  return error || !Array.isArray(data) ? [] : (data as PublicLegalDoc[]);
});

export const getPublicLegalDoc = cache(async (slug: string): Promise<PublicLegalDoc | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("get_public_legal", { doc: slug });
  return (Array.isArray(data) && (data[0] as PublicLegalDoc)) || null;
});

/** True only when every listed document has a version in effect. */
export async function allInEffect(slugs: string[]) {
  const docs = await getPublicLegal();
  return slugs.every((s) => docs.find((d) => d.slug === s)?.in_effect);
}
