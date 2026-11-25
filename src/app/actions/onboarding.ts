"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const CONSENT_VERSION = "2026-11";

/** Records the member's agreement to the Terms and Privacy Policy (consent records). */
export async function acceptAgreements(_prev: { ok: boolean } | null, form: FormData) {
  const viewer = await getViewer();
  if (!viewer || form.get("agree") !== "on") return { ok: false };
  const supabase = (await createClient())!;
  await supabase.from("consents").insert([
    { user_id: viewer.id, consent_type: "terms", version: CONSENT_VERSION },
    { user_id: viewer.id, consent_type: "privacy", version: CONSENT_VERSION },
    ...(form.get("marketing") === "on" ? [{ user_id: viewer.id, consent_type: "marketing", version: CONSENT_VERSION }] : []),
  ]);
  revalidatePath("/app/onboarding");
  return { ok: true };
}
