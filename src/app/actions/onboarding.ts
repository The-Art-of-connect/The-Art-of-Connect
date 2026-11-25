"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { consentVersions } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

const MEMBER_DOCUMENTS = ["terms", "privacy", "membership_agreement", "community_standards", "refund_policy", "safety_policy", "matchmaking", "counseling_disclaimer"];

/** Records the member's agreement to each document, with the exact version accepted. */
export async function acceptAgreements(_prev: { ok: boolean } | null, form: FormData) {
  const viewer = await getViewer();
  if (!viewer || form.get("agree") !== "on") return { ok: false };
  const supabase = (await createClient())!;
  const rows = consentVersions(MEMBER_DOCUMENTS).map((c) => ({ user_id: viewer.id, ...c }));
  if (form.get("marketing") === "on") rows.push({ user_id: viewer.id, consent_type: "marketing", version: "2026-11" });
  await supabase.from("consents").insert(rows);
  revalidatePath("/app/onboarding");
  return { ok: true };
}
