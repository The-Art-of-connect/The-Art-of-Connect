import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { serverSecret } from "@/lib/env";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader } from "@/components/admin/ui";
import { eliteSaveStripeVerification } from "@/app/actions/elite";
import { STRIPE_APPROVAL_REQUEST, STRIPE_APPROVAL_REQUEST_VERSION, approvalRequestText } from "@/lib/stripe-approval-request";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stripe Verification Center" };

/** Researched from Stripe's published docs, terms and pricing on November 26, 2026. Prices are pay-as-you-go list prices. */
const COSTS = [
  ["Stripe Identity: ID document + selfie", "$1.50 per completed verification", "First 50 verifications free. Custom pricing above 2,000 a month."],
  ["Stripe Identity: SSN lookup", "$0.50 per lookup", "Not used. We don't collect Social Security numbers."],
  ["Financial Connections: account ownership", "$1.50 per successful call", "One call per linked account."],
  ["Financial Connections: balances", "$0.10 per successful call", "One call per linked account."],
  ["Financial Connections: transactions", "$0.30 per account per month", "We take one snapshot of the history the bank provides (Stripe returns up to about 180 days, not 12 months), then disconnect, so expect one month per account."],
  ["Financial Connections: instant bank verification", "$1.50 per success", "Applies to ACH payment accounts. We don't request payment permission; confirm with Stripe that it isn't billed for our data-only sessions."],
  ["Payments: domestic cards", "2.9% + 30¢ per transaction", "+0.5% manually entered, +1.5% international, +1% currency conversion."],
  ["Billing: subscriptions", "0.7% of Billing volume", "Pay-as-you-go plan, for Elite memberships."],
];

const EXAMPLES = [
  ["Identity only (one candidate)", "$1.50"],
  ["Identity + one linked bank account", "about $3.40 ($1.50 + $1.50 + $0.10 + $0.30)"],
  ["Expedited verification fee of $995 (if approved)", "about $29.16 in card fees, leaving about $965.84"],
  ["Elite membership at $249.99 a month", "about $9.30 a month ($7.55 card + $1.75 Billing)"],
];

const REQUIREMENTS = [
  { title: "Stripe Identity", ok: "Permitted, with conditions", items: [
    "Activate Identity in the Stripe Dashboard (Identity application). Available to US businesses.",
    "Permitted: verifying adults (16+) for trust, safety and fraud prevention. Our members are 21+.",
    "Not permitted: any FCRA purpose (credit, insurance, housing, employment eligibility) or reselling identity data. Elite is a membership distinction, not one of these, but have counsel confirm.",
    "Selfie checks process biometric data. Where law requires it, or if a member declines the selfie, we must offer a non-biometric alternative. Ours is private document review by you.",
    "Stripe's restricted-business list includes online dating and matchmaking (it needs added due diligence). Identity may not be used to further a restricted business without Stripe's approval, so ask Stripe to confirm your account covers In Love matchmaking and Elite dating.",
  ]},
  { title: "Stripe Financial Connections", ok: "Requires Stripe approval before live use", items: [
    "At least 14 days before collecting live data, submit our intended purpose (and the consent screen, if we host it) to Stripe for review and approval.",
    "Our proposed Authorized Purpose is in the approval request below.",
    "Transaction history: Stripe returns up to about 180 days, depending on the bank. We record the actual dates covered and never present partial history as annual income.",
    "Stripe's terms: never sell or share the data, never use it for marketing, and never use it as or to create a consumer report (FCRA). Keep consent records for at least 24 months.",
    "Stripe markets Financial Connections data for payments, fraud and financial products. A membership-eligibility review is a use Stripe must explicitly approve, so don't enable production until it has.",
    "Needs NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Netlify for the same mode as the secret key.",
  ]},
  { title: "Stripe Payments (fee and subscriptions)", ok: "Already integrated; fees stay off", items: [
    "The expedited fee goes through Stripe Checkout and is reported separately from membership revenue.",
    "The fee only becomes payable once you approve it (APPROVE in Elite rules) and live payments are on.",
    "Stripe may review our account for the dating and matchmaking category before live payouts.",
  ]},
];

const WEBHOOK_EVENTS = [
  "identity.verification_session.verified", "identity.verification_session.requires_input", "identity.verification_session.processing", "identity.verification_session.canceled",
  "financial_connections.account.refreshed_balance", "financial_connections.account.refreshed_ownership", "financial_connections.account.refreshed_transactions",
  "checkout.session.expired",
];

export default async function EliteVerificationPage() {
  await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const [{ data: s }, launch, { data: revenue }] = await Promise.all([
    supabase.from("elite_settings").select("financial_connections_live, financial_purpose_approved").maybeSingle(),
    getLaunchState(),
    supabase.rpc("elite_verification_revenue"),
  ]);
  const key = serverSecret("STRIPE_SECRET_KEY");
  const mode = !key ? "Not configured" : key.includes("_live_") ? "Live" : "Sandbox (test)";
  const pk = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  const pkOk = Boolean(pk) && (key.includes("_live_") ? pk.startsWith("pk_live_") : pk.startsWith("pk_test_"));
  const rev = (revenue ?? []) as { livemode: boolean; paid_count: number; gross_cents: number; refunded_cents: number }[];
  const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

  const status = [
    ["Stripe mode", mode],
    ["Publishable key (for bank connection)", pkOk ? "Configured" : pk ? "Wrong mode for the secret key" : "Not set: add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Netlify"],
    ["Identity: production", launch.identity_verification_live && !launch.testSession ? "On" : "Off (Sandbox testing available)"],
    ["Financial Connections: Stripe purpose approved", s?.financial_purpose_approved ? "Yes (confirmed by you)" : "Not yet"],
    ["Financial Connections: production", s?.financial_connections_live ? "On" : "Off (Sandbox testing available)"],
  ];

  return (
    <>
      <PageHeader eyebrow="Owner Portal · Elite" title="Stripe Verification Center" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Stripe is the only verification provider. No other paid verification service (Plaid, Middesk or any other) is connected, and none will be without your authorization. <Link href="/admin/elite" className="text-gold underline">Back to the Elite Management Center</Link></p>

      <section className="glass p-6">
        <h2 className="display text-2xl">Current status</h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {status.map(([k, v]) => <div key={k} className="rounded-xl border border-line p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {REQUIREMENTS.map((r) => (
          <div key={r.title} className="glass p-6">
            <p className="display text-2xl">{r.title}</p>
            <p className="mt-1 text-xs font-semibold text-gold">{r.ok}</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted">{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </section>

      <section className="glass mt-8 p-6" id="approval-request">
        <h2 className="display text-2xl">Stripe approval request</h2>
        <p className="mt-1 text-sm text-muted">Version {STRIPE_APPROVAL_REQUEST_VERSION}. Send it to Stripe through Dashboard → Support, or with the Financial Connections purpose submission. Have your attorney review it first. Copy the full text from the box at the end.</p>
        <div className="mt-5 space-y-5">
          {STRIPE_APPROVAL_REQUEST.map((sec) => (
            <div key={sec.heading}>
              <p className="font-semibold">{sec.heading}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">{sec.body.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          ))}
        </div>
        <label className="mt-6 block text-xs text-muted">Full text to copy<textarea readOnly rows={10} className="field mt-1 w-full font-mono text-[0.7rem]" defaultValue={approvalRequestText()} /></label>
      </section>

      <section className="glass mt-8 p-6">
        <h2 className="display text-2xl">Costs (Stripe list prices)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="py-2 pr-4">Service</th><th className="py-2 pr-4">Price</th><th className="py-2">Notes</th></tr></thead>
            <tbody className="divide-y divide-line">{COSTS.map(([a, b, c]) => <tr key={a}><td className="py-2 pr-4">{a}</td><td className="py-2 pr-4 font-semibold">{b}</td><td className="py-2 text-xs text-muted">{c}</td></tr>)}</tbody>
          </table>
        </div>
        <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{EXAMPLES.map(([a, b]) => <li key={a} className="rounded-xl border border-line p-3"><span className="block text-xs text-muted">{a}</span>{b}</li>)}</ul>
        <p className="mt-3 text-xs text-faint">Sandbox use is free. Nothing is billed until production services are on.</p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ActionForm action={eliteSaveStripeVerification} className="glass space-y-3 p-6">
          <h2 className="display text-2xl">Production bank verification</h2>
          <p className="text-sm text-muted">Sandbox testing works now with fictional data. Turn production on only after Stripe approves our Authorized Purpose in writing.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="purpose_approved" defaultChecked={s?.financial_purpose_approved} /> Stripe has approved our Financial Connections purpose and consent screen</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="fc_live" defaultChecked={s?.financial_connections_live} /> Turn on production Financial Connections (Stripe bills each use)</label>
          <input name="confirm" placeholder="Type APPROVE to turn on" className="field w-full text-xs" autoComplete="off" />
          <button className="btn btn-gold btn-sm">Save</button>
          <p className="text-xs text-faint">Production Identity follows the identity verification switch in <Link href="/admin/launch" className="underline">Launch controls</Link>. The expedited fee follows your approval in Elite rules.</p>
        </ActionForm>

        <section className="glass p-6">
          <h2 className="display text-2xl">Elite verification revenue</h2>
          <p className="text-sm text-muted">Reported separately from membership revenue.</p>
          {rev.length === 0 ? <p className="mt-3 text-sm text-muted">No verification payments yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">{rev.map((r) => <li key={String(r.livemode)} className="rounded-xl border border-line p-3">{r.livemode ? "Live" : "Sandbox (test)"}: {r.paid_count} paid · {money(r.gross_cents)} gross · {money(r.refunded_cents)} refunded</li>)}</ul>
          )}
          <h3 className="mt-6 font-semibold">Stripe webhook events this needs</h3>
          <ul className="mt-2 space-y-1 font-mono text-[0.7rem] text-muted">{WEBHOOK_EVENTS.map((e) => <li key={e}>{e}</li>)}</ul>
          <p className="mt-2 text-xs text-faint">Added to the Sandbox webhook. Add the same events to the live webhook at launch.</p>
        </section>
      </div>
    </>
  );
}
