import Image from "next/image";
import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEATURE_STATUS, HELP_NEEDED, HELP_OFFERED, basicPathway } from "@/lib/business-options";
import { saveGoal, setFeatureInterest, toggleReadiness } from "@/app/actions/business";
import { ActionForm } from "@/components/admin/ActionForm";
import { SocietyHero } from "@/components/business/SocietyHero";
import { Greeting } from "@/components/business/Greeting";
import { insightForToday } from "@/lib/business-insights";
import { formatWhen } from "@/lib/webinars";
import { DiscoveryInvite } from "@/components/DiscoveryInvite";

export const metadata = { title: "The Professional Society" };
export const dynamic = "force-dynamic";

export default async function BusinessHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { viewer, preview } = await requireExperience("business");
  const welcome = (await searchParams).welcome === "1";
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: profile }, { data: goals }, { data: items }, { data: done }, { data: features }, { data: interest }, { data: tier }, { data: convs }] = await Promise.all([
    biz.from("profiles").select("company, display_name, help_needed, help_offered, onboarding_completed_at, public_profile_consent").eq("user_id", viewer.id).maybeSingle(),
    biz.from("goals").select("*").eq("user_id", viewer.id).order("created_at"),
    biz.from("readiness_items").select("key, title, description, area").eq("is_active", true).order("sort_order"),
    biz.from("readiness_progress").select("item_key").eq("user_id", viewer.id),
    biz.from("features").select("key, name, description, free, premium, status, scheduled_status, scheduled_at").order("sort_order"),
    biz.from("feature_interest").select("feature_key").eq("user_id", viewer.id),
    biz.rpc("member_tier"),
    biz.from("conversations").select("id, status, recipient_id").order("last_message_at", { ascending: false }),
  ]);
  // Live community figures — real records only, never placeholders.
  const [{ count: openPosts }, { data: nextWebinars }, { data: used }, { data: allowance }] = await Promise.all([
    biz.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    biz.from("webinars").select("id, title, host_display_name, starts_at, time_zone").eq("status", "approved").gt("starts_at", new Date().toISOString()).order("starts_at").limit(1),
    biz.rpc("complimentary_used"),
    biz.rpc("complimentary_allowance"),
  ]);

  const doneSet = new Set((done ?? []).map((d) => d.item_key));
  const incomplete = (items ?? []).filter((i) => !doneSet.has(i.key));
  const pathway = basicPathway(profile?.help_needed ?? [], incomplete);
  const interested = new Set((interest ?? []).map((i) => i.feature_key));
  const statusOf = (f: { status: string; scheduled_status: string | null; scheduled_at: string | null }) =>
    f.scheduled_at && f.scheduled_status && new Date(f.scheduled_at) <= new Date() ? f.scheduled_status : f.status;
  const pendingRequests = (convs ?? []).filter((c) => c.status === "requested" && c.recipient_id === viewer.id).length;
  const premium = tier === "premium";
  const readinessShare = items?.length ? doneSet.size / items.length : 0;
  const progress = Math.round((profile?.onboarding_completed_at ? 50 : 0) + 50 * readinessShare);
  const next = nextWebinars?.[0];
  const remaining = Math.max(0, Number(allowance ?? 3) - Number(used ?? 0));
  const tiles = [
    { href: "/app/business/board", title: "Connect", sub: "Find business connections", icon: "M12 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM6 15.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm12 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM12 8.5v3m0 0-5 4m5-4 5 4" },
    { href: "/app/business/board/new", title: "Collaborate", sub: "Help or receive help", icon: "M4 6h10v7H8l-4 3.5zM10 16h6l4 3.5V10h-3" },
    { href: "/app/business/learn", title: "Learn", sub: "Explore webinars", icon: "M4 7.5h11v9H4zM15 10.5l5-3v9l-5-3" },
    { href: profile?.onboarding_completed_at ? "#pathway" : "/app/business/onboarding", title: "Grow", sub: "Build your business", icon: "M4 18l5.5-5.5 3.5 3.5L20 9m0 0h-5m5 0v5" },
  ];

  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Staff preview — The Professional Society is not open to members yet.</p>}

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="display text-3xl text-gold">AC</span>
          <span><span className="block font-semibold leading-tight">The Professional Society</span><span className="block text-[0.65rem] tracking-[0.22em] uppercase text-muted">The Art of Connect</span></span>
        </div>
        <span className="rounded-full border border-champagne/50 px-3 py-1 text-xs font-semibold text-gold">{premium ? "Member" : "Founding Member"}</span>
      </div>

      <SocietyHero ctaHref="/app/business/board" />

      <section className="mt-10">
        <Greeting name={profile?.display_name || viewer.displayName} />
        <p className="mt-1 text-muted">Welcome to your society. What would you like to accomplish today?</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiles.map((t, i) => (
            <Link key={t.title} href={t.href} className="glass lift tile-in group p-5 sm:p-6" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-gold transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
              <span className="mt-4 block text-xl font-semibold">{t.title}</span>
              <span className="mt-1 block text-sm text-muted">{t.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Link href="/app/business/onboarding" className="lift tile-in block rounded-[24px] border border-champagne/40 bg-champagne/20 p-6 sm:p-7" style={{ animationDelay: "500ms" }}>
          <p className="eyebrow">Your business discovery</p>
          <p className="display mt-3 text-3xl">{profile?.onboarding_completed_at ? "Your business profile" : "Let’s get to know your business."}</p>
          <p className="mt-2 text-muted">Your goals. Your challenges. Your expertise.</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-ivory/70" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Profile progress">
            <div className="progress-fill h-full rounded-full bg-gradient-to-r from-gold-deep via-champagne to-gold-bright" style={{ width: `${Math.max(progress, 3)}%` }} />
          </div>
          <p className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">{profile?.onboarding_completed_at ? `${progress}% complete — keep building` : "Begin your business profile"}</span><span className="text-gold" aria-hidden="true">→</span></p>
        </Link>

        <Link href="/app/business/board" className="glass lift tile-in block p-6 sm:p-7" style={{ animationDelay: "580ms" }}>
          <p className="eyebrow">The Business Connection Board</p>
          <p className="display mt-3 text-3xl">Connections without boundaries.</p>
          <p className="mt-1 text-sm text-muted">City to city. State to state.</p>
          <p className="mt-3 text-sm">Exchange expertise, find mentors and discover opportunities to collaborate with fellow business owners.</p>
          <p className="mt-4 text-sm font-semibold text-gold">
            {openPosts ? `${openPosts} open ${openPosts === 1 ? "post" : "posts"} from business owners →` : "Founding community · Be the first to post →"}
            {pendingRequests ? <span className="ml-2 rounded-full bg-burgundy px-2 py-0.5 text-xs text-ivory">{pendingRequests} new request{pendingRequests > 1 ? "s" : ""}</span> : null}
          </p>
        </Link>

        <Link href={next ? `/app/business/learn/${next.id}` : "/app/business/learn"} className="glass lift tile-in group block p-6 sm:p-7" style={{ animationDelay: "660ms" }}>
          <div className="flex gap-4">
            <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-36">
              <Image src="/images/society/presenter.webp" alt="" fill sizes="144px" className="object-cover object-[50%_30%] transition-transform duration-700 group-hover:scale-110" />
            </div>
            <div>
              <p className="eyebrow">The Knowledge Exchange</p>
              <p className="display mt-2 text-2xl sm:text-3xl">Learn from business owners.</p>
            </div>
          </div>
          {next ? (
            <p className="mt-3 text-sm"><span className="font-semibold">Next: {next.title}</span><span className="block text-muted">{next.host_display_name} · {formatWhen(next.starts_at, next.time_zone).date} · {formatWhen(next.starts_at, next.time_zone).time}</span></p>
          ) : (
            <p className="mt-3 text-sm text-muted">Discover webinars, share your knowledge and expand your expertise. The first webinars are being prepared.</p>
          )}
          <p className="mt-4 text-sm font-semibold text-gold">{premium ? "Unlimited webinars with your membership →" : `${remaining} complimentary ${remaining === 1 ? "webinar" : "webinars"} remaining →`}</p>
        </Link>

        <Link href={premium ? "/app/journey" : "/membership"} className="theme-dark lift tile-in relative block overflow-hidden rounded-[24px] bg-ink p-6 sm:p-7" style={{ animationDelay: "740ms" }}>
          <div className="glow-breathe pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(197_165_114/0.45),transparent_70%)]" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <span className="display flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-champagne/60 text-2xl text-gold-bright">J</span>
            <span className="min-w-0 flex-1">
              <span className="display block text-3xl text-gold-bright">Journey for Business</span>
              <span className="block text-sm text-muted">{premium ? "Your AI business concierge" : "Exclusive paid membership benefit"}</span>
            </span>
            {!premium && <svg viewBox="0 0 24 24" className="h-6 w-6 text-gold" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="Locked"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>}
          </div>
          <p className="relative mt-4">Your vision deserves strategy, clarity and direction.</p>
          <span className="relative mt-5 inline-flex rounded-full border border-champagne/60 px-5 py-2 text-sm text-gold-bright">{premium ? "Talk with Journey" : "Explore Membership Benefits"}</span>
        </Link>
      </div>

      <DiscoveryInvite userId={viewer.id} back="/app/business" context="Before you start, grow or partner in a business — know your values, your strengths and the standards you’ll keep for any client, partner or price." />

      <figure className="theme-dark tile-in relative mt-8 overflow-hidden rounded-[24px] bg-ink px-6 py-8 sm:px-10" style={{ animationDelay: "820ms" }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_100%,rgb(116_63_77/0.45),transparent_70%)]" aria-hidden="true" />
        <p className="relative eyebrow">Today’s business insight</p>
        <blockquote className="display relative mt-3 text-2xl italic leading-snug text-ivory sm:text-3xl">“{insightForToday()}”</blockquote>
        <figcaption className="relative mt-3 text-xs text-muted">The Art of Connect · a new insight every day</figcaption>
      </figure>

      {welcome && <p className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">Thank you — your business profile is saved.</p>}

      {!profile?.onboarding_completed_at ? null : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section id="pathway" className="glass scroll-mt-24 p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-3xl">Your business development pathway</h2>
                <Link href="/app/business/onboarding" className="text-sm text-gold underline">Update my answers</Link>
              </div>
              <p className="mt-1 text-sm text-muted">Practical next steps based on what you told us. Guidance only — not professional advice.</p>
              <ol className="mt-5 space-y-3">
                {pathway.map((s, i) => (
                  <li key={s.title} className="flex gap-4 rounded-xl border border-line p-4">
                    <span className="display text-2xl text-gold">{i + 1}</span>
                    <span><span className="block font-semibold">{s.title}</span><span className="block text-sm text-muted">{s.why}</span></span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="glass p-7">
              <h2 className="display text-3xl">Business goals</h2>
              <ul className="mt-4 space-y-3">
                {(goals ?? []).map((g) => (
                  <li key={g.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{g.title}</p>
                      <span className="text-xs text-muted">{g.horizon === "long" ? "Long-term" : "Short-term"}{g.target_date ? ` · by ${g.target_date}` : ""}{g.status === "achieved" ? " · Achieved" : ""}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-champagne" style={{ width: `${g.progress}%` }} /></div>
                    <ActionForm action={saveGoal} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="id" value={g.id} />
                      <input name="progress" type="number" min={0} max={100} step={5} defaultValue={g.progress} className="field !min-h-0 !w-24 !py-1.5" aria-label="Progress percent" />
                      <span className="text-muted">%</span>
                      <button className="btn btn-ghost btn-sm">Update</button>
                    </ActionForm>
                  </li>
                ))}
                {!goals?.length && <li className="text-sm text-muted">No goals yet. Add your first one below.</li>}
              </ul>
              <ActionForm action={saveGoal} className="mt-5 grid gap-3 sm:grid-cols-[1fr_9rem_10rem_auto]">
                <input name="title" placeholder="e.g. Open a second location" className="field" aria-label="Goal" />
                <select name="horizon" className="field" aria-label="Horizon"><option value="short">Short-term</option><option value="long">Long-term</option></select>
                <input name="targetDate" type="date" className="field" aria-label="Target date" />
                <button className="btn btn-gold btn-sm">Add goal</button>
              </ActionForm>
            </section>

            <section className="glass p-7">
              <h2 className="display text-3xl">Business readiness checklist</h2>
              <p className="mt-1 text-sm text-muted">{doneSet.size} of {items?.length ?? 0} complete.</p>
              <ul className="mt-4 divide-y divide-line">
                {(items ?? []).map((it) => (
                  <li key={it.key} className="flex items-start justify-between gap-4 py-3">
                    <span><span className="block font-semibold">{it.title}</span><span className="block text-xs text-muted">{it.area} · {it.description}</span></span>
                    <ActionForm action={toggleReadiness}>
                      <input type="hidden" name="key" value={it.key} />
                      <input type="hidden" name="done" value={doneSet.has(it.key) ? "0" : "1"} />
                      <button className={`btn btn-sm ${doneSet.has(it.key) ? "btn-gold" : "btn-ghost"}`}>{doneSet.has(it.key) ? "✓ Done" : "Mark done"}</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="theme-dark band rounded-[24px] p-7">
              <h2 className="display text-3xl">The Business Connection Board</h2>
              <p className="mt-2 text-sm text-muted">Your city. Your state. Beyond your boundaries.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href="/app/business/board" className="btn btn-gold">Browse the board</Link>
                <Link href="/app/business/board/new" className="btn btn-ghost">Create a business post</Link>
                <Link href="/app/business/learn" className="btn btn-ghost">The Knowledge Exchange · webinars</Link>
                <Link href="/app/business/inbox" className="btn btn-ghost">
                  Private inbox{pendingRequests ? ` · ${pendingRequests} new request${pendingRequests > 1 ? "s" : ""}` : ""}
                </Link>
              </div>
            </section>

            <section className="glass p-7">
              <h2 className="text-lg font-semibold">What you shared</h2>
              <p className="mt-3 text-xs font-semibold tracking-wide text-gold uppercase">Looking for</p>
              <p className="mt-1 text-sm">{(profile.help_needed ?? []).map((h: string) => HELP_NEEDED[h]).join(" · ") || "—"}</p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-gold uppercase">Can help with</p>
              <p className="mt-1 text-sm">{(profile.help_offered ?? []).map((h: string) => HELP_OFFERED[h]).join(" · ") || "—"}</p>
              <p className="mt-4 text-xs text-muted">{profile.public_profile_consent ? "Your profile is shown on the public Explore page." : "Your profile is not public."}</p>
            </section>

            <section className="glass p-7">
              <h2 className="text-lg font-semibold">Features</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {(features ?? []).filter((f) => f.free || f.premium).map((f) => {
                  const st = statusOf(f);
                  const live = st === "available_now" || st === "growing_community";
                  const included = premium ? f.premium : f.free;
                  return (
                    <li key={f.key} className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{f.name}</span>
                        <span className={`chip shrink-0 normal-case tracking-normal !text-[0.65rem] ${FEATURE_STATUS[st]?.tone ?? ""}`}>{FEATURE_STATUS[st]?.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{f.description}</p>
                      {!included && <p className="mt-1 text-xs text-gold">Included with Professional Society membership</p>}
                      {!live && (
                        <ActionForm action={setFeatureInterest} className="mt-2">
                          <input type="hidden" name="key" value={f.key} />
                          <input type="hidden" name="on" value={interested.has(f.key) ? "0" : "1"} />
                          <button className="text-xs text-gold underline">{interested.has(f.key) ? "✓ You’ll be notified — undo" : "Notify me when available"}</button>
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
