import Link from "next/link";
import { eliteCanChoose } from "@/lib/elite";
import { CancelMembership } from "@/components/CancelMembership";
import { SocietyPanel } from "@/components/SocietyPanel";
import { MemberBilling } from "@/components/MemberBilling";
import { UpdateCard } from "@/components/UpdateCard";
import { MembershipChoices } from "@/components/MembershipChoices";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { getLaunchState } from "@/lib/launch";
import { formatMoney, type Selection } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My membership" };

const LOCKED: Record<string, string> = {
  connect: "The Connection Feed, circles, events, people and messages",
  business: "The Professional Society",
  relationships: "The Personal Society for singles and couples",
  journey: "Personalized Journey",
};

export default async function MyMembershipPage({ searchParams }: { searchParams: Promise<{ locked?: string }> }) {
  const viewer = (await getViewer())!;
  const locked = LOCKED[(await searchParams).locked ?? ""] ?? null;
  const eliteDb = isInsidePreview(viewer) ? null : await createClient();
  const { data: eliteRow } = eliteDb ? await eliteDb.from("elite_candidates").select("status").eq("user_id", viewer.id).maybeSingle() : { data: null };
  const eliteInvited = eliteCanChoose(eliteRow?.status);
  const supabase = (await createClient())!;
  const [{ data: sub }, catalogue, launch] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier_slug, tier_name, experiences, billing_interval, amount_cents, couples_upgrade, addons, status, current_period_end, cancel_at_period_end, trial_end")
      .eq("user_id", viewer.id)
      .eq("kind", "member")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCatalogue(),
    getLaunchState(),
  ]);
  const { data: trialOpen } = isInsidePreview(viewer) ? { data: true } : await supabase.rpc("trial_available", { p: viewer.id });

  // Membership access v2: a free account is The Art of Becoming. Three equal choices; none is a required step.
  const current = sub && ["active", "trialing"].includes(sub.status);
  if (!sub || !current) {
    return (
      <>
        {locked && (
          <div className="mb-8 rounded-2xl border border-gold/40 bg-gold/5 p-5 text-sm" role="status">
            <p className="font-semibold">{locked} is part of every paid membership.</p>
            <p className="mt-1 text-muted">Choose a membership or try one free for 15 days. You can read about every feature on our <Link href="/membership" className="text-gold underline">membership page</Link>.</p>
          </div>
        )}
        {sub?.status === "past_due" || sub?.status === "unpaid" ? (
          <div className="mb-8 rounded-2xl border border-rose-400/40 bg-rose-400/5 p-5 text-sm" role="alert">
            <p className="font-semibold">We couldn’t process your {sub.tier_name} payment.</p>
            <p className="mt-1 text-muted">Your paid features are paused until your account is current. The Art of Becoming stays open to you. Update your card and Stripe will retry the payment.</p>
            <div className="mt-3"><UpdateCard /></div>
          </div>
        ) : null}
        <p className="eyebrow">My membership</p>
        <h1 className="display mt-3 text-4xl">The Art of Becoming</h1>
        <p className="mt-3 max-w-2xl text-muted">Your complimentary foundation: The Art of Self, personal discovery, identity, self-love, emotional intelligence, boundaries, love languages, private journaling and your Discovery Portfolio. It’s yours, free, for as long as you like.</p>
        <MembershipChoices trialAvailable={Boolean(trialOpen)} />
      </>
    );
  }

  const allAccessPkg = catalogue.packages.find((p) => p.slug === sub.tier_slug && p.all_access) ?? null;
  const allAccess = Boolean(allAccessPkg);
  const initial: Selection = { experiences: sub.experiences ?? [], interval: sub.billing_interval === "year" ? "year" : "month", couples: sub.couples_upgrade, addons: sub.addons ?? [] };
  return (
    <>
      <p className="eyebrow">My membership</p>
      <h1 className="display mt-4 text-5xl">{sub.tier_name}</h1>
      <p className="mt-3 text-muted">
        {formatMoney(sub.amount_cents, catalogue.currency)} {sub.billing_interval === "year" ? "per year" : "per month"} · {sub.status}
        {sub.current_period_end ? ` · ${sub.cancel_at_period_end ? "ends" : "renews"} ${new Date(sub.current_period_end).toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""}
      </p>
      {sub.status === "trialing" && sub.trial_end && (
        <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/5 p-5 text-sm">
          <p className="font-semibold">Your 15-day trial ends {new Date(sub.trial_end).toLocaleDateString("en-US", { dateStyle: "long" })}.</p>
          <p className="mt-1 text-muted">{sub.cancel_at_period_end
            ? "Your trial is cancelled: you won’t be charged, and access continues until then."
            : `Then ${formatMoney(sub.amount_cents, catalogue.currency)} ${sub.billing_interval === "year" ? "per year" : "per month"} is charged to your card on file, and every ${sub.billing_interval === "year" ? "year" : "month"} after. Cancel any time before then and you won’t be charged.`}</p>
        </div>
      )}
      <CancelMembership cancelling={sub.cancel_at_period_end} trialEnd={sub.status === "trialing" && sub.trial_end ? new Date(sub.trial_end).toLocaleDateString("en-US", { dateStyle: "long" }) : null} />
      <div className="mt-3"><UpdateCard label="Update card on file" /></div>
      {allAccess ? (
        <section className="theme-dark mt-10 rounded-[28px] border border-[#c9a96e]/50 p-8" style={{ background: "#1b1310" }}>
          <p className="text-xs uppercase tracking-[0.25em] text-[#f0c98a]">Elite Membership — All Access</p>
          <ul className="mt-4 grid gap-2 text-sm text-[#f5ecdf]/85 sm:grid-cols-2">{(allAccessPkg?.benefits ?? []).map((b) => <li key={b} className="flex gap-2"><span className="text-[#e8892b]" aria-hidden="true">✓</span>{b}</li>)}</ul>
          <p className="mt-5 text-xs text-[#f5ecdf]/60">Everything is included. The only optional extra is additional Journey voice time, offered at our cost in <Link href="/app/journey/plus" className="underline">Journey Plus</Link>. Billing questions: <Link href="/app/support" className="underline">priority support</Link>.</p>
        </section>
      ) : <>
      <h2 className="mt-14 mb-6 text-lg font-semibold">Add or remove experiences, or change billing</h2>
      <MemberBilling catalogue={catalogue} initial={initial} paymentsOpen={launch.payments_live} kind="change" eliteInvited={eliteInvited} />
      </>}
      {viewer.society && <SocietyPanel current={viewer.society} />}
    </>
  );
}
