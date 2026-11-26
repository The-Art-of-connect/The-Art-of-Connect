import type { Metadata } from "next";
import Link from "next/link";
import { EliteBadge } from "@/components/EliteBadge";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ELITE_BENEFITS, ELITE_QUALIFICATIONS, ELITE_TAGLINE, usd, type Thresholds } from "@/lib/elite";

export const metadata: Metadata = {
  title: "Elite Concierge Society",
  description: "Our highest distinction, by invitation only. A society of verified, accomplished individuals seeking exceptional connections In Business, In Life and In Love.",
  alternates: { canonical: "/elite" },
};
export const dynamic = "force-dynamic";

const PATHWAYS = [
  { title: "Earned invitation", body: "Members who satisfy an approved qualification, complete verification and reach their membership milestones receive a private invitation automatically. Complimentary." },
  { title: "Expedited verification", body: "For exceptionally accomplished individuals whose responsibilities don't allow the extended journey. Offered only after preliminary screening. It purchases a more efficient verification, never admission." },
  { title: "Founder's invitation", body: "Our founder may personally recognize and invite exceptional individuals for their leadership, impact and accomplishments." },
];

export default async function ElitePage() {
  const viewer = await getViewer();
  const admin = createAdminClient();
  const { data: s } = admin ? await admin.from("elite_settings").select("thresholds").maybeSingle() : { data: null };
  const t = (s?.thresholds ?? {}) as Thresholds;
  return (
    <div className="theme-dark" style={{ background: "#1b1310" }}>
      <section className="relative overflow-hidden px-4 pb-20 pt-24 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(232_112_26/0.16),transparent_70%),radial-gradient(45%_40%_at_80%_100%,rgb(122_46_62/0.35),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-[#c9a96e]/50 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.3em] text-[#f0c98a]">
            <EliteBadge size={18} interactive={false} /> By Invitation Only
          </div>
          <h1 className="display mt-8 text-5xl text-[#f6e7c8] sm:text-7xl">Elite Concierge Society</h1>
          <p className="display mt-4 text-2xl italic text-[#e8892b] sm:text-3xl">{ELITE_TAGLINE}</p>
          <p className="mx-auto mt-6 max-w-2xl text-[#f5ecdf]/80">Our highest distinction within The Art of Connect: a society of verified, accomplished and distinguished individuals seeking exceptional connections In Business, In Life and In Love. Elite isn&rsquo;t a membership anyone can simply purchase.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <h2 className="display text-center text-4xl text-[#f6e7c8]">Three paths to one distinction</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PATHWAYS.map((p) => (
            <div key={p.title} className="rounded-[24px] border border-[#c9a96e]/40 bg-white/[0.03] p-7">
              <p className="display text-2xl text-[#f0c98a]">{p.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#f5ecdf]/80">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-[#f5ecdf]/55">Every Elite member receives the same distinction. How someone was admitted is never shown.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <h2 className="display text-center text-4xl text-[#f6e7c8]">What Elite members receive</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#f5ecdf]/75">Once verified and welcomed, you carry the gold Elite distinction and connect with fellow Elite members In Business, In Love and In Life.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ELITE_BENEFITS.map((x) => (
            <div key={x.id} className="rounded-[22px] border border-[#c9a96e]/40 bg-white/[0.03] p-5">
              {x.id === "badge" ? <EliteBadge size={30} /> : <span className="block h-[30px] w-[30px] rounded-full border border-[#e8892b]/60" aria-hidden="true" />}
              <p className="display mt-3 text-xl text-[#f0c98a]">{x.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#f5ecdf]/75">{x.body}</p>
              {!x.ready && <p className="mt-3 text-[0.62rem] uppercase tracking-wider text-[#f5ecdf]/50">In preparation</p>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[#f5ecdf]/55">Connections marked &ldquo;In preparation&rdquo; are being built and aren&rsquo;t available yet. Introductions are never guaranteed.</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <h2 className="display text-center text-4xl text-[#f6e7c8]">Qualification</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#f5ecdf]/75">Candidates generally satisfy at least one approved pathway. Every qualification is verified, and identity verification, age requirements and our safety standards always apply.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {ELITE_QUALIFICATIONS.map((q) => {
            const th = q.threshold ? t[q.threshold] : null;
            return (
              <li key={q.id} className="rounded-2xl border border-[#c9a96e]/25 p-5">
                <p className="font-semibold text-[#f0c98a]">{q.label}</p>
                <p className="mt-1 text-sm text-[#f5ecdf]/75">{q.detail}</p>
                {th?.approved && <p className="mt-2 text-xs text-[#e8892b]">Threshold: {usd(th.amount)}</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center text-xs text-[#f5ecdf]/55">Eligibility never considers race, gender, disability, medical history or counseling participation. Financial details are never shown to anyone, and the Elite badge never reveals them.</p>
      </section>

      <section className="px-4 pb-24 text-center sm:px-8">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#e8892b]/40 bg-white/[0.03] p-8">
          <p className="display text-3xl text-[#f6e7c8]">Explore your eligibility</p>
          <p className="mt-3 text-sm text-[#f5ecdf]/75">A private, no-obligation look at the pathways and your progress. Nothing is charged, and no one else sees your answers.</p>
          {viewer
            ? <Link href="/app/elite/eligibility" className="btn btn-gold mt-6">My Elite eligibility</Link>
            : <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/sign-in?next=/app/elite/eligibility" className="btn btn-gold">Sign in</Link><Link href="/membership" className="btn btn-ghost">Become a member</Link></div>}
        </div>
      </section>
    </div>
  );
}
