import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTENTS, POST_STATUS, STAGES, US_STATES } from "@/lib/business-options";

export const metadata = { title: "The Business Connection Board" };
export const dynamic = "force-dynamic";

type Search = { q?: string; state?: string; city?: string; industry?: string; category?: string; intent?: string; stage?: string; scope?: string; view?: string };

export default async function ConnectionBoard({ searchParams }: { searchParams: Promise<Search> }) {
  const { viewer, preview } = await requireExperience("business");
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: categories }, { data: industries }, { data: me }, { data: saved }] = await Promise.all([
    biz.from("categories").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("profiles").select("city, state").eq("user_id", viewer.id).maybeSingle(),
    biz.from("saved_posts").select("post_id").eq("user_id", viewer.id),
  ]);

  let q = biz.from("posts").select("id, author_id, intent, category, title, description, industry, city, state, scope, stage, status, created_at").order("created_at", { ascending: false }).limit(60);
  if (sp.view === "mine") q = q.eq("author_id", viewer.id);
  else q = q.in("status", ["open", "connection_established"]);
  if (sp.view === "saved") q = q.in("id", (saved ?? []).map((s) => s.post_id).concat("00000000-0000-0000-0000-000000000000"));
  if (sp.state && sp.state in US_STATES) q = q.eq("state", sp.state);
  if (sp.city) q = q.ilike("city", sp.city.replace(/[%_]/g, "").slice(0, 80));
  if (sp.industry) q = q.eq("industry", sp.industry);
  if (sp.category) q = q.eq("category", sp.category);
  if (sp.intent && sp.intent in INTENTS) q = q.eq("intent", sp.intent);
  if (sp.stage && sp.stage in STAGES) q = q.eq("stage", sp.stage);
  if (sp.scope === "local" && me?.city) q = q.ilike("city", me.city).eq("state", me.state ?? "");
  if (sp.scope === "state" && me?.state) q = q.eq("state", me.state);
  if (sp.q) {
    const term = sp.q.replace(/[%_,()]/g, " ").trim().slice(0, 80);
    if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data: posts, error } = await q;
  const catName = Object.fromEntries((categories ?? []).map((c) => [c.slug, c.name]));
  const indName = Object.fromEntries((industries ?? []).map((i) => [i.slug, i.name]));
  const savedSet = new Set((saved ?? []).map((s) => s.post_id));
  const tab = (view: string | undefined, label: string) => (
    <Link href={view ? `/app/business/board?view=${view}` : "/app/business/board"} className={`nav-pill text-sm ${sp.view === view ? "!border-champagne !bg-champagne/15" : ""}`}>{label}</Link>
  );

  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — The Professional Society is not open to members yet.</p>}
      <div className="theme-dark band rounded-[28px] p-8 text-center sm:p-10">
        <p className="eyebrow">The Professional Society</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">The Business Connection Board</h1>
        <p className="mt-3 text-muted">Your city. Your state. Beyond your boundaries.</p>
        <Link href="/app/business/board/new" className="btn btn-gold mt-6">+ Create a business post</Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">{tab(undefined, "All connections")}{tab("saved", "Saved")}{tab("mine", "My posts")}</div>

      <form method="get" className="glass mt-4 grid gap-3 p-5 md:grid-cols-4">
        {sp.view && <input type="hidden" name="view" value={sp.view} />}
        <input name="q" defaultValue={sp.q ?? ""} type="search" placeholder="Search posts" className="field md:col-span-2" aria-label="Search posts" />
        <select name="scope" defaultValue={sp.scope ?? ""} className="field" aria-label="Distance">
          <option value="">Nationwide</option><option value="state">My state</option><option value="local">My city</option>
        </select>
        <select name="intent" defaultValue={sp.intent ?? ""} className="field" aria-label="Type">
          <option value="">Seeking & offering</option>
          {Object.entries(INTENTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className="field" aria-label="Category">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="industry" defaultValue={sp.industry ?? ""} className="field" aria-label="Industry">
          <option value="">All industries</option>
          {(industries ?? []).map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
        </select>
        <select name="state" defaultValue={sp.state ?? ""} className="field" aria-label="State">
          <option value="">Any state</option>
          {Object.entries(US_STATES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="flex gap-2">
          <input name="city" defaultValue={sp.city ?? ""} placeholder="City" className="field" aria-label="City" />
          <button className="btn btn-gold btn-sm shrink-0">Filter</button>
        </div>
      </form>

      {error ? (
        <p className="mt-8 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 text-sm">The Connection Board isn’t available right now. Please check back soon.</p>
      ) : posts?.length ? (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id} className="glass flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="display flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-espresso text-lg text-gold">{p.state ?? "US"}</span>
                  <span>
                    <span className="block font-semibold">{[p.city, p.state ? US_STATES[p.state] : null].filter(Boolean).join(", ") || "Nationwide"}</span>
                    <span className="block text-xs text-muted">{INTENTS[p.intent]}{p.status !== "open" ? ` · ${POST_STATUS[p.status]}` : ""}</span>
                  </span>
                </div>
                {savedSet.has(p.id) && <span className="text-gold" title="Saved" aria-label="Saved">★</span>}
              </div>
              <h2 className="display mt-4 text-2xl">{p.title}</h2>
              <p className="mt-1 text-xs font-semibold tracking-wide text-gold">{catName[p.category] ?? p.category}{p.industry ? ` · ${indName[p.industry] ?? p.industry}` : ""}</p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted">{p.description}</p>
              <p className="mt-3 text-xs text-faint">Posted {new Date(p.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
              <Link href={`/app/business/board/${p.id}`} className="btn btn-ghost mt-4">{p.author_id === viewer.id ? "Manage my post" : "✉ I Can Help · Connect Privately"}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-champagne/50 bg-champagne/10 p-8 text-center">
          <p className="display text-2xl">{sp.view === "mine" ? "You haven’t posted yet." : "Our founding community is growing."}</p>
          <p className="mt-2 text-sm text-muted">{sp.view === "mine" ? "Share what your business needs — or what you can offer." : "No posts match yet. Be among the first to share what your business needs or the expertise you can offer."}</p>
          <Link href="/app/business/board/new" className="btn btn-gold mt-5">Create a business post</Link>
        </div>
      )}
    </>
  );
}
