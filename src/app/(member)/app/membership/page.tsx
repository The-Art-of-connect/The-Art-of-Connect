import Link from "next/link";
import { MemberBilling } from "@/components/MemberBilling";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { formatMoney, type Selection } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My membership" };

export default async function MyMembershipPage() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [{ data: sub }, catalogue, launch] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier_name, experiences, billing_interval, amount_cents, couples_upgrade, addons, status, current_period_end, cancel_at_period_end")
      .eq("user_id", viewer.id)
      .eq("kind", "member")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCatalogue(),
    getLaunchState(),
  ]);

  if (!sub) {
    return (
      <div className="glass p-8 text-center">
        <h1 className="display text-4xl">You don’t have a membership yet.</h1>
        <Link href="/app/onboarding" className="btn btn-gold mt-8">Build Your Membership</Link>
      </div>
    );
  }

  const initial: Selection = { experiences: sub.experiences ?? [], interval: sub.billing_interval === "year" ? "year" : "month", couples: sub.couples_upgrade, addons: sub.addons ?? [] };
  return (
    <>
      <p className="eyebrow">My membership</p>
      <h1 className="display mt-4 text-5xl">{sub.tier_name}</h1>
      <p className="mt-3 text-muted">
        {formatMoney(sub.amount_cents, catalogue.currency)} {sub.billing_interval === "year" ? "per year" : "per month"} · {sub.status}
        {sub.current_period_end ? ` · ${sub.cancel_at_period_end ? "ends" : "renews"} ${new Date(sub.current_period_end).toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""}
      </p>
      <h2 className="mt-14 mb-6 text-lg font-semibold">Add or remove experiences, or change billing</h2>
      <MemberBilling catalogue={catalogue} initial={initial} paymentsOpen={launch.payments_live} kind="change" />
    </>
  );
}
