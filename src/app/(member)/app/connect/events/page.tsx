import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL, EVENT_ORIGIN_LABEL } from "@/lib/social";
import { formatEventTime, signPhotos } from "@/lib/social-server";

export const metadata = { title: "The Connect Calendar" };
type Ev = { id: string; title: string; starts_at: string; timezone: string; city: string | null; region: string | null; country: string | null; mode: string; category: string; origin: string; is_free: boolean; cost_text: string | null; photo_path: string | null; eligibility: string };

/** The Connect Calendar: members inform members about experiences worth sharing. */
export default async function Events({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await getViewer();
  const db = (await createClient())!;
  const when = sp.when ?? "upcoming";
  const now = new Date();
  const until = when === "week" ? new Date(now.getTime() + 7 * 86400000) : when === "month" ? new Date(now.getTime() + 31 * 86400000) : null;
  let q = db.from("social_events").select("id, title, starts_at, timezone, city, region, country, mode, category, origin, is_free, cost_text, photo_path, eligibility").eq("status", "active").gte("starts_at", now.toISOString()).order("starts_at").limit(100);
  if (until) q = q.lte("starts_at", until.toISOString());
  if (sp.category && EVENT_CATEGORIES.some(([k]) => k === sp.category)) q = q.eq("category", sp.category);
  if (sp.mode === "virtual") q = q.in("mode", ["virtual", "hybrid"]); else if (sp.mode === "in_person") q = q.in("mode", ["in_person", "hybrid"]);
  if (sp.price === "free") q = q.eq("is_free", true);
  if (sp.city) q = q.ilike("city", `%${sp.city.slice(0, 60)}%`);
  if (sp.country) q = q.ilike("country", `%${sp.country.slice(0, 60)}%`);
  if (sp.eligibility && ["all", "couples", "singles", "elite"].includes(sp.eligibility)) q = q.eq("eligibility", sp.eligibility);
  const { data } = await q;
  const list = (data ?? []) as Ev[];
  const urls = await signPhotos(db, list.map((e) => e.photo_path));
  const Chip = ({ k, v, label }: { k: string; v: string; label: string }) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, x]) => x) as [string, string][]);
    if (sp[k] === v) next.delete(k); else next.set(k, v);
    return <Link href={`/app/connect/events?${next}`} className={`rounded-full border px-3 py-1 text-sm ${sp[k] === v ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{label}</Link>;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The Connect Calendar</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">What&rsquo;s happening?</h1>
          <p className="mt-2 text-muted">Discover experiences. Meet like-minded people. Experience life together.</p>
        </div>
        <Link href="/app/connect/events/new" className="btn btn-gold">+ Share an event</Link>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">{EVENT_CATEGORIES.map(([k, v]) => <Chip key={k} k="category" v={k} label={v} />)}</div>
        <div className="flex flex-wrap gap-2">
          <Chip k="when" v="week" label="This week" /><Chip k="when" v="month" label="This month" />
          <Chip k="mode" v="in_person" label="In person" /><Chip k="mode" v="virtual" label="Virtual" />
          <Chip k="price" v="free" label="Free" />
          <Chip k="eligibility" v="couples" label="Couples" /><Chip k="eligibility" v="singles" label="Singles" /><Chip k="eligibility" v="elite" label="Elite" />
        </div>
        <form className="flex flex-wrap gap-2" action="/app/connect/events">
          {Object.entries(sp).filter(([k, v]) => v && !["city", "country"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input name="city" defaultValue={sp.city ?? ""} placeholder="City" className="field !w-40 !py-1.5 text-sm" />
          <input name="country" defaultValue={sp.country ?? ""} placeholder="Country" className="field !w-40 !py-1.5 text-sm" />
          <button className="btn btn-ghost btn-sm">Filter</button>
        </form>
      </section>

      {list.length === 0 ? (
        <div className="glass p-8 text-center"><p className="display text-2xl">No events match yet.</p><p className="mt-2 text-sm text-muted">Know of something worth attending? Share it, even if you&rsquo;re not the organizer.</p></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">{list.map((e) => (
          <li key={e.id}>
            <Link href={`/app/connect/events/${e.id}`} className="glass block overflow-hidden !p-0 transition hover:border-gold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.photo_path && urls[e.photo_path] && <img src={urls[e.photo_path]} alt="" className="h-44 w-full object-cover" />}
              <div className="p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold-deep">{EVENT_CATEGORY_LABEL[e.category]} · {EVENT_ORIGIN_LABEL[e.origin]}</p>
                <p className="display mt-1 text-2xl">{e.title}</p>
                <p className="mt-1 text-sm text-muted">{formatEventTime(e.starts_at, e.timezone)}</p>
                <p className="text-sm text-muted">{e.mode === "virtual" ? "Virtual" : [e.city, e.region, e.country].filter(Boolean).join(", ")}{e.mode === "hybrid" ? " · also virtual" : ""} · {e.is_free ? "Free" : e.cost_text ?? "Admission charged"}</p>
              </div>
            </Link>
          </li>
        ))}</ul>
      )}
      <p className="text-xs text-faint">Events shared by members are labeled with who organizes them. The Art of Connect does not sell tickets for member events; always buy through the official organizer&rsquo;s link.</p>
    </div>
  );
}
