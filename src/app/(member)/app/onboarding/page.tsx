import { redirect } from "next/navigation";
import { MemberBilling } from "@/components/MemberBilling";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import type { Selection } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Complete your membership" };

export default async function OnboardingPage() {
  const viewer = (await getViewer())!;
  if (viewer.accountType !== "member") redirect("/app");
  const supabase = (await createClient())!;
  const [{ data: auth }, { data: accepted }, { data: sub }, catalogue, launch] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("legal_acceptances").select("document_slug").eq("user_id", viewer.id).eq("document_slug", "terms-of-service").limit(1),
    supabase.from("subscriptions").select("id").eq("user_id", viewer.id).in("status", ["active", "trialing", "past_due"]).maybeSingle(),
    getCatalogue(),
    getLaunchState(),
  ]);
  if (sub) redirect("/app/membership");

  const saved = (auth.user?.user_metadata?.selection ?? {}) as Partial<Selection>;
  const initial: Selection = {
    experiences: Array.isArray(saved.experiences) ? saved.experiences : [],
    interval: saved.interval === "year" ? "year" : "month",
    couples: Boolean(saved.couples),
    addons: Array.isArray(saved.addons) ? saved.addons : [],
    package: typeof (saved as { package?: unknown }).package === "string" ? (saved as { package: string }).package : null,
  };
  // Registration records acceptance of the Terms in effect; updated agreements are handled by the member area's acceptance step.
  const agreed = Boolean(accepted?.length);

  return (
    <>
      <p className="eyebrow">Welcome, {viewer.displayName ?? "member"}</p>
      <h1 className="display mt-4 text-5xl">Complete your membership.</h1>
      <ol className="mt-10 space-y-12">
        <li className="glass p-7 sm:p-9">
          <p className="flex items-baseline gap-3"><span className="display text-3xl text-gold">01</span><span className="text-lg font-semibold">Your agreements</span></p>
          <div className="mt-5">
            {agreed ? (
              <p className="text-sm text-success">✓ Terms of Service, Privacy Policy and Community Standards accepted.</p>
            ) : (
              <p className="text-sm text-muted">Our membership agreements are being finalized. You’ll be asked to accept them before your membership begins.</p>
            )}
          </div>
        </li>
        <li className={agreed ? "" : "pointer-events-none opacity-50"} aria-disabled={!agreed}>
          <p className="mb-6 flex items-baseline gap-3"><span className="display text-3xl text-gold">02</span><span className="text-lg font-semibold">Review your membership and pay securely</span></p>
          <MemberBilling catalogue={catalogue} initial={initial} paymentsOpen={launch.payments_live && agreed} kind="checkout" />
        </li>
      </ol>
    </>
  );
}
