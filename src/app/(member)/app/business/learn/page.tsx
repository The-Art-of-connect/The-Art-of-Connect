import Image from "next/image";
import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEATURE_STATUS, recommendWebinars } from "@/lib/business-options";
import { formatWhen, getPublicWebinars, mediaUrl, type PublicWebinar } from "@/lib/webinars";
import { registerHostInterest } from "@/app/actions/webinars";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "The Knowledge Exchange" };
export const dynamic = "force-dynamic";

function Card({ w, topics }: { w: PublicWebinar; topics: Record<string, string> }) {
  const img = mediaUrl(w.promo_image_path);
  const { date, time } = formatWhen(w.starts_at, w.time_zone);
  return (
    <li className="glass flex flex-col overflow-hidden">
      {img ? (
        <div className="relative aspect-[16/9] w-full"><Image src={img} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" /></div>
      ) : (
        <div className="theme-dark band flex aspect-[16/9] items-center justify-center p-6 text-center"><p className="display text-2xl text-gold">{w.title}</p></div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-gold uppercase">{(w.topic && topics[w.topic]) || "Business webinar"}{w.access === "members_only" ? " · Members" : ""}</p>
        <h3 className="display mt-2 text-2xl">{w.title}</h3>
        <p className="mt-1 text-sm text-muted">{w.host_display_name}</p>
        <p className="mt-3 text-sm">{date} · {time}</p>
        <Link href={`/app/business/learn/${w.id}`} className="btn btn-ghost mt-4">View & register</Link>
      </div>
    </li>
  );
}

export default async function KnowledgeExchange() {
  const { viewer, preview } = await requireExperience("business");
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [webinars, { data: tier }, { data: used }, { data: allowance }, { data: canHost }, { data: profile }, { data: topics }, { data: mine }, { data: interest }, { data: features }] = await Promise.all([
    getPublicWebinars(),
    biz.rpc("member_tier"),
    biz.rpc("complimentary_used"),
    biz.rpc("complimentary_allowance"),
    biz.rpc("can_host"),
    biz.from("profiles").select("help_needed, industry").eq("user_id", viewer.id).maybeSingle(),
    biz.from("webinar_topics").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("webinars").select("id, title, status, starts_at").eq("host_id", viewer.id).order("starts_at", { ascending: false }),
    biz.from("webinar_host_interest").select("topics").eq("user_id", viewer.id).maybeSingle(),
    biz.from("features").select("key, status").in("key", ["knowledge_exchange", "webinar_hosting"]),
  ]);
  const topicName = Object.fromEntries((topics ?? []).map((t) => [t.slug, t.name]));
  const upcoming = webinars.filter((w) => w.status === "approved" && new Date(w.starts_at).getTime() + w.duration_minutes * 60_000 > Date.now());
  const recommended = recommendWebinars(upcoming, profile?.help_needed ?? [], profile?.industry ?? null).slice(0, 3);
  const free = tier !== "premium";
  const usedN = Number(used ?? 0);
  const allowanceN = Number(allowance ?? 3);
  const left = Math.max(0, allowanceN - usedN);
  const hostingStatus = (features ?? []).find((f) => f.key === "webinar_hosting")?.status ?? "coming_soon";

  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Staff preview — The Professional Society is not open to members yet.</p>}
      <div className="theme-dark band rounded-[28px] p-8 text-center sm:p-10">
        <p className="eyebrow">The Professional Society</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">The Knowledge Exchange</h1>
        <p className="mt-3 text-gold">Learn from experience. Share your expertise. Grow together.</p>
      </div>

      {free ? (
        <section className="glass mt-6 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <div><p className="font-semibold">Your complimentary webinars</p><p className="text-sm text-muted">Free business account allowance</p></div>
            <p className="display text-4xl text-gold">{left} of {allowanceN}</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-champagne" style={{ width: `${allowanceN ? (left / allowanceN) * 100 : 0}%` }} /></div>
          <p className="mt-3 text-xs text-muted">Only webinars you join count — browsing, registering and replays don’t. {left === 0 ? "Professional Society membership includes unlimited eligible webinars." : ""}</p>
        </section>
      ) : (
        <p className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">Your Professional Society membership includes unlimited eligible webinars.</p>
      )}

      {recommended.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">Recommended for your business</h2>
          <p className="mt-1 text-sm text-muted">Based on what you told us your business needs.</p>
          <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{recommended.map((w) => <Card key={w.id} w={w} topics={topicName} />)}</ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="display text-3xl">Upcoming webinars</h2>
        {upcoming.length ? (
          <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((w) => <Card key={w.id} w={w} topics={topicName} />)}</ul>
        ) : (
          <div className="mt-5 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 text-sm">
            <span className={`chip normal-case tracking-normal ${FEATURE_STATUS.growing_community.tone}`}>Growing Community</span>
            <p className="mt-3 text-muted">Our first webinars are being prepared by founding members. New webinars appear here as soon as they’re approved.</p>
          </div>
        )}
      </section>

      <section className="theme-dark band mt-10 rounded-[24px] p-7 sm:p-9">
        <h2 className="display text-3xl">Have knowledge worth sharing?</h2>
        <p className="mt-2 text-muted">Host your own webinar and connect with business owners nationwide.</p>
        {canHost ? (
          <>
            <Link href="/app/business/learn/host/new" className="btn btn-gold mt-5">Create a webinar</Link>
            {mine?.length ? (
              <ul className="mt-6 divide-y divide-line text-sm">
                {mine.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/app/business/learn/host/${m.id}`} className="hover:text-gold">{m.title}</Link>
                    <span className="chip normal-case tracking-normal">{m.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-4 text-sm">
              <span className={`chip normal-case tracking-normal ${FEATURE_STATUS[hostingStatus]?.tone ?? ""}`}>{FEATURE_STATUS[hostingStatus]?.label ?? "Coming Soon"}</span>
              <span className="ml-2 text-muted">Hosting is included with Professional Society membership.</span>
            </p>
            <ActionForm action={registerHostInterest} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input name="topics" defaultValue={interest?.topics ?? ""} placeholder="What would you like to teach? e.g. multi-state expansion" className="field" aria-label="Topics you would like to teach" />
              <button className="btn btn-gold">{interest ? "Update my interest" : "Register your interest in hosting"}</button>
            </ActionForm>
          </>
        )}
      </section>
    </>
  );
}
