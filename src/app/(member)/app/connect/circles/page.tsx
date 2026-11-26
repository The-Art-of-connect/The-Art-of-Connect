import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { circleAction, proposeCircle } from "@/app/actions/social";
import { ALIGNMENT_NOTE, ALIGNMENT_ORDER, CIRCLE_KIND_LABEL, ELIGIBILITY_LABEL, INTERESTS, recommendCircle } from "@/lib/social";
import { EliteBadge } from "@/components/EliteBadge";

export const metadata = { title: "Find Your Circle" };
type Circle = { id: string; slug: string; name: string; tagline: string | null; category: string; kind: string; eligibility: string; interests: string[] };

/** Find Your Circle. Recommends with reasons; every eligible circle is open to explore and join. */
export default async function Circles({ searchParams }: { searchParams: Promise<{ category?: string; view?: string }> }) {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer) || Boolean(viewer.viewAs);
  const sp = await searchParams;
  const db = (await createClient())!;
  const [{ data: circles }, { data: cats }, { data: mine }, { data: profile }, { data: badge }, { data: couple }] = await Promise.all([
    db.from("social_circles").select("id, slug, name, tagline, category, kind, eligibility, interests").eq("status", "active").order("name"),
    db.from("social_circle_categories").select("key, name, sort").eq("status", "active").order("sort"),
    preview ? Promise.resolve({ data: [] }) : db.from("social_circle_members").select("circle_id").eq("user_id", viewer.id),
    preview ? Promise.resolve({ data: null }) : db.from("social_profiles").select("interests").eq("user_id", viewer.id).maybeSingle(),
    preview ? Promise.resolve({ data: null }) : db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle(),
    preview ? Promise.resolve({ data: null }) : db.schema("relationships").from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const list = (circles ?? []) as Circle[];
  const joined = new Set((mine ?? []).map((m) => m.circle_id));
  const interests = profile?.interests ?? [];
  const elite = badge?.status === "active";
  const eligibleHint = (c: Circle) => c.eligibility === "all" || (c.eligibility === "elite" && elite) || (c.eligibility === "couples" && Boolean(couple)) || c.eligibility === "singles";
  const filtered = sp.category ? list.filter((c) => c.category === sp.category) : list;
  const recs = list.filter((c) => !joined.has(c.id) && eligibleHint(c)).map((c) => ({ c, ...recommendCircle(c, interests) }));

  const Card = ({ c, reason }: { c: Circle; reason?: string }) => (
    <li className="glass flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/app/connect/circles/${c.slug}`} className="display text-2xl hover:underline">{c.name}</Link>
        {c.kind === "elite" && <EliteBadge size={20} interactive={false} />}
      </div>
      {c.tagline && <p className="mt-1 text-sm text-muted">{c.tagline}</p>}
      <p className="mt-2 text-[0.7rem] uppercase tracking-wider text-faint">{CIRCLE_KIND_LABEL[c.kind]}{c.eligibility !== "all" ? ` · ${ELIGIBILITY_LABEL[c.eligibility]}` : ""}</p>
      {reason && <p className="mt-2 text-xs text-gold-deep">Why: {reason}</p>}
      <div className="mt-auto pt-4">
        {preview ? null : joined.has(c.id) ? <Link href={`/app/connect/circles/${c.slug}`} className="btn btn-ghost btn-sm">Open</Link> : (
          <ActionForm action={circleAction}><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="join" /><button className="btn btn-gold btn-sm">Join</button></ActionForm>
        )}
      </div>
    </li>
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">The Art of Connect</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Find Your People.</h1>
        <p className="mt-2 max-w-2xl text-muted">Discover communities that complement your personality, interests, ambitions and lifestyle. Join as many as you like, explore beyond your usual interests, and leave whenever you choose.</p>
      </header>

      {!preview && sp.view !== "all" && !sp.category && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="display text-3xl">Recommended for you</h2>
            {interests.length === 0 && <Link href="/app/connect/profile" className="text-sm text-gold underline">Add your interests for better recommendations</Link>}
          </div>
          {ALIGNMENT_ORDER.map((level) => {
            const group = recs.filter((r) => r.level === level).slice(0, 6);
            if (!group.length) return null;
            return (
              <div key={level}>
                <p className="font-semibold">{level} <span className="text-xs font-normal text-muted">· {ALIGNMENT_NOTE[level]}</span></p>
                <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.map((r) => <Card key={r.c.id} c={r.c} reason={r.reason} />)}</ul>
              </div>
            );
          })}
          <p className="text-xs text-faint">These are opportunities, not rankings of anyone. Recommendations never consider income, Elite status or membership level.</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="display text-3xl">Explore every circle</h2>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/app/connect/circles?view=all" className={`rounded-full border px-3 py-1 ${!sp.category && sp.view === "all" ? "border-gold bg-gold/10" : "border-line"}`}>All</Link>
          {(cats ?? []).map((k) => <Link key={k.key} href={`/app/connect/circles?category=${k.key}`} className={`rounded-full border px-3 py-1 ${sp.category === k.key ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{k.name}</Link>)}
        </nav>
        {(sp.category || sp.view === "all") && <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((c) => <Card key={c.id} c={c} />)}</ul>}
      </section>

      {joined.size > 0 && (
        <section>
          <h2 className="display text-3xl">My circles</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.filter((c) => joined.has(c.id)).map((c) => <Card key={c.id} c={c} />)}</ul>
        </section>
      )}

      {!preview && (
        <ActionForm action={proposeCircle} className="glass space-y-3 p-6">
          <h2 className="display text-2xl">Start a circle</h2>
          <p className="text-sm text-muted">Propose a community around a shared interest. Our founder reviews every proposal; once approved, you&rsquo;ll host it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Name<input name="name" required maxLength={80} className="field mt-1 w-full" /></label>
            <label className="text-sm">Category<select name="category" className="field mt-1 w-full">{(cats ?? []).filter((k) => !["elite", "couples", "singles"].includes(k.key)).map((k) => <option key={k.key} value={k.key}>{k.name}</option>)}</select></label>
          </div>
          <label className="block text-sm">One line about it<input name="tagline" maxLength={160} className="field mt-1 w-full" /></label>
          <label className="block text-sm">Description<textarea name="description" rows={3} maxLength={2000} className="field mt-1 w-full" /></label>
          <div className="flex flex-wrap gap-2">{INTERESTS.map(([k, v]) => <label key={k} className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs has-[:checked]:border-[#e8701a]"><input type="checkbox" name="interests" value={k} className="sr-only" />{v}</label>)}</div>
          <button className="btn btn-gold btn-sm">Send for approval</button>
        </ActionForm>
      )}
    </div>
  );
}
