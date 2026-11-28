import type { Metadata } from "next";
import Link from "next/link";
import { EliteBadge } from "@/components/EliteBadge";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";
import { EliteExperienceIcon } from "@/components/EliteIcons";
import { ELITE_BENEFITS, ELITE_EXPERIENCES, ELITE_QUALIFICATIONS, ELITE_TAGLINE, usd, type Thresholds } from "@/lib/elite";

export const metadata: Metadata = {
  title: "Elite Concierge",
  description: "Apply for Elite Membership. An elevated connection society of verified, accomplished individuals, In Business, In Life and In Love. Qualification and verification required.",
  alternates: { canonical: "/elite" },
};
export const dynamic = "force-dynamic";

const PATHWAYS = [
  { title: "Direct application", body: "Anyone may apply, with no other membership required. Create your account, choose your qualification pathway, verify your identity with Stripe and share supporting evidence. Standard verification is complimentary." },
  { title: "Earned membership", body: "Members of The Art of Connect whose verified qualifications and membership milestones satisfy our requirements receive their invitation automatically." },
  { title: "Priority verification", body: "For preliminarily qualified applicants who prefer faster processing, optional priority verification is available. It's never required and never guarantees admission." },
  { title: "Founder's invitation", body: "Our founder may personally verify, approve and invite exceptional individuals, including those whose accomplishments fall outside our standard financial thresholds." },
];

export default async function ElitePage() {
  const viewer = await getViewer();
  const admin = createAdminClient();
  const { data: s } = admin ? await admin.from("elite_settings").select("thresholds").maybeSingle() : { data: null };
  const t = (s?.thresholds ?? {}) as Thresholds;
  const allAccess = ((await getCatalogue()).packages.find((p) => p.slug === "elite-concierge")?.benefits ?? []) as string[];
  return (
    <div className="theme-dark" style={{ background: "#1b1310" }}>
      <section className="relative overflow-hidden px-4 pb-20 pt-24 text-center sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(232_112_26/0.16),transparent_70%),radial-gradient(45%_40%_at_80%_100%,rgb(122_46_62/0.35),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-[#c9a96e]/50 px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.3em] text-[#f0c98a]">
            <EliteBadge size={18} interactive={false} /> Qualification and verification required
          </div>
          <h1 className="display mt-8 text-5xl text-[#f6e7c8] sm:text-7xl">Elite Concierge</h1>
          <p className="display mt-4 text-2xl italic text-[#e8892b] sm:text-3xl">{ELITE_TAGLINE}</p>
          <p className="mx-auto mt-6 max-w-2xl text-[#f5ecdf]/80">Our highest distinction within The Art of Connect: a society of verified, accomplished and distinguished individuals seeking exceptional connections In Business, In Life and In Love. Our exclusivity comes from who qualifies, not from who may apply.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={viewer ? "/app/elite/eligibility" : "/join/elite"} className="btn btn-gold">Apply for Elite Membership</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <h2 className="display text-center text-4xl text-[#f6e7c8]">Four paths to one distinction</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#f5ecdf]/75">Elite is an elevated connection society: not only dating, and not only networking. Choose the experiences you want; once verified and activated, you carry the gold Elite distinction.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ELITE_BENEFITS.map((x) => (
            <div key={x.id} className="rounded-[22px] border border-[#c9a96e]/40 bg-white/[0.03] p-5">
              {x.id === "badge" ? <EliteBadge size={30} /> : <span className="text-[#f0c98a]"><EliteExperienceIcon kind={ELITE_EXPERIENCES.find((e) => e.id === x.id)?.icon ?? "sparkle"} size={30} /></span>}
              <p className="display mt-3 text-xl text-[#f0c98a]">{x.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#f5ecdf]/75">{x.body}</p>
              {!x.ready && <p className="mt-3 text-[0.62rem] uppercase tracking-wider text-[#f5ecdf]/50">In preparation</p>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[#f5ecdf]/55">Connections marked &ldquo;In preparation&rdquo; are being built and aren&rsquo;t available yet. Introductions are never guaranteed.</p>
      </section>

      {allAccess.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-8">
          <div className="rounded-[28px] border border-[#c9a96e]/50 bg-white/[0.03] p-8">
            <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-[#f0c98a]"><EliteBadge size={18} interactive={false} /> Elite Membership</p>
            <h2 className="display mt-3 text-center text-4xl text-[#f6e7c8]">All Access</h2>
            <ul className="mt-6 grid gap-2.5 text-sm text-[#f5ecdf]/85 sm:grid-cols-2">{allAccess.map((b) => <li key={b} className="flex gap-2"><span className="text-[#e8892b]" aria-hidden="true">✓</span>{b}</li>)}</ul>
            <p className="mt-5 text-center text-xs text-[#f5ecdf]/55">Available once your Elite application is approved. Singles and couples services follow their own age and relationship-status requirements.</p>
          </div>
        </section>
      )}

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
          <p className="display text-3xl text-[#f6e7c8]">Apply for Elite Membership</p>
          <p className="mt-3 text-sm text-[#f5ecdf]/75">Qualification and verification required. Applying is free, standard verification is complimentary, and no one else sees your answers. Elite Concierge membership becomes available to purchase once you&rsquo;re approved.</p>
          {viewer
            ? <Link href="/app/elite/eligibility" className="btn btn-gold mt-6">Continue my application</Link>
            : <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/join/elite" className="btn btn-gold">Apply now</Link><Link href="/sign-in?next=/app/elite/eligibility" className="btn btn-ghost">Members: sign in to apply</Link></div>}
        </div>
      </section>
    </div>
  );
}
