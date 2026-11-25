import Link from "next/link";
import { getViewer, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getJourneyStatus } from "@/lib/journey-server";
import { DISCOVERY_CATEGORIES } from "@/lib/journey-discovery";
import { startDiscovery } from "@/app/actions/discovery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discovery Sessions with Journey" };

const FREE = [
  { href: "/app/know-yourself/identity-self-love", label: "Identity & Self-Love" },
  { href: "/app/know-yourself/emotional-intelligence/lessons", label: "Emotional Intelligence" },
  { href: "/app/know-yourself", label: "Who Am I?" },
  { href: "/app/know-yourself/love-languages", label: "Five Love Languages" },
  { href: "/app/know-yourself/boundaries", label: "Boundaries & Self-Worth" },
];

export default async function DiscoverHub() {
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const paid = status.access === "standard" || status.access === "enhanced" || (status.access === "staff" && hasRole(viewer, ["owner"]));
  const supabase = await createClient();
  const [{ data: sessions }, { data: analyses }] = paid && supabase
    ? await Promise.all([
        supabase.from("journey_discovery_sessions").select("category, status, exchanges, updated_at").eq("user_id", viewer.id),
        supabase.from("discovery_analyses").select("scope, created_at").eq("user_id", viewer.id).like("scope", "category:%").order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const date = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[28px] bg-ink px-6 py-12 sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_85%_0%,rgb(116_63_77/0.55),transparent_70%)]" />
        <p className="eyebrow relative">Journey · Discovery Sessions</p>
        <h1 className="display relative mt-3 max-w-2xl text-4xl leading-tight sm:text-6xl">No two people are alike. <span className="gilded italic">Neither are their journeys.</span></h1>
        <p className="relative mt-4 max-w-xl text-muted">Journey listens to your answers and asks the next question for you alone, exploring the why behind what matters to you, then writes a personal summary. Skip anything, change topics or pause whenever you wish.</p>
      </section>

      {!paid ? (
        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="glass p-7">
            <p className="eyebrow">Included for every member</p>
            <p className="display mt-2 text-2xl">Self-guided discovery</p>
            <p className="mt-2 text-sm text-muted">Standardized questions, thoughtful explanations and a written analysis, with no AI and nothing to pay.</p>
            <ul className="mt-4 space-y-2 text-sm">{FREE.map((f) => <li key={f.href}><Link href={f.href} className="text-burgundy">{f.label} →</Link></li>)}</ul>
          </div>
          <div className="theme-dark rounded-[24px] bg-ink p-7 text-ivory">
            <p className="eyebrow">Adaptive discovery with Journey</p>
            <p className="display mt-2 text-2xl text-gold-bright">A paid membership benefit</p>
            <p className="mt-2 text-sm text-muted">Personalized questions that adapt to every answer, across 14 areas of life, with a private summary of your own.</p>
            <Link href="/membership" className="btn btn-gold btn-sm mt-5">Explore memberships</Link>
          </div>
        </section>
      ) : (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVERY_CATEGORIES.map((c) => {
            const active = (sessions ?? []).find((s) => s.category === c.key && s.status === "active");
            const last = (analyses ?? []).find((a) => a.scope === `category:${c.key}`);
            return (
              <div key={c.key} className="glass flex flex-col p-6">
                <p className="display text-2xl text-burgundy">{c.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{c.intro}</p>
                <p className="mt-3 text-xs text-gold-deep">{active ? `In progress · ${active.exchanges} exchange${active.exchanges === 1 ? "" : "s"}` : last ? `Summary saved ${date(last.created_at)}` : "Not started"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {active ? (
                    <Link href={`/app/journey/discover/${c.key}`} className="btn btn-gold btn-sm">Resume</Link>
                  ) : (
                    <form action={startDiscovery}><input type="hidden" name="category" value={c.key} /><button className="btn btn-gold btn-sm">{last ? "Begin again" : "Begin"}</button></form>
                  )}
                  {last && <Link href={`/app/journey/discover/${c.key}`} className="btn btn-ghost btn-sm">My summary</Link>}
                </div>
              </div>
            );
          })}
        </section>
      )}
      <p className="mt-8 text-center text-xs text-muted">Educational and reflective, never a clinical assessment. Identity verification and professionally reviewed assessments remain separate, standardized processes.</p>
    </>
  );
}
