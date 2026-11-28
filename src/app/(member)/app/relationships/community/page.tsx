import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { EliteBadge } from "@/components/EliteBadge";
import { COUPLES_TABS, isCouplesCircle } from "@/lib/in-love";
import { CIRCLE_KIND_LABEL } from "@/lib/social";
import { brandName } from "@/lib/brand";
import { couplesCircle, proposeCouplesCircle } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Couples Connection Community · In Love" };

type Circle = { id: string; slug: string; name: string; tagline: string | null; category: string; kind: string; eligibility: string; status: string; created_by: string | null };

/**
 * Couples Connection Community (founder directive 08, built under directive 51 §4). It reuses Find Your Circle: Couples
 * Connection Circles are couples-only circles, and the database lets only members of an active couple join or propose one.
 * Couples friendship networking stays separate from singles matchmaking; each partner keeps their own account and privacy.
 */
export default async function CouplesCommunity() {
  const { viewer, preview } = await requireExperience("relationships");
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const rel = live ? db?.schema("relationships") : null;
  const [{ data: circles }, { data: mine }, { data: cm }, { data: badge }] = db
    ? await Promise.all([
        db.from("social_circles").select("id, slug, name, tagline, category, kind, eligibility, status, created_by").or("eligibility.eq.couples,category.eq.couples").in("status", ["active", "proposed"]).order("name"),
        live ? db.from("social_circle_members").select("circle_id").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
        rel ? rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
        live ? db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
      ])
    : [{ data: [] }, { data: [] }, { data: null }, { data: null }];
  const { count } = rel && cm ? await rel.from("couple_members").select("user_id", { count: "exact", head: true }).eq("couple_id", cm.couple_id) : { count: 0 };
  const activeCouple = (count ?? 0) > 1;
  const elite = badge?.status === "active";
  const list = ((circles ?? []) as Circle[]).filter(isCouplesCircle);
  const active = list.filter((c) => c.status === "active");
  const myProposals = list.filter((c) => c.status === "proposed" && c.created_by === viewer.id);
  const joined = new Set((mine ?? []).map((m) => m.circle_id as string));
  // Mirrors the database: every Couples Connection Circle needs an active couple; Elite Couples also needs Elite membership.
  const canJoin = (c: Circle) => activeCouple && (c.eligibility !== "elite" || elite);
  const myCircles = active.filter((c) => joined.has(c.id));
  const others = active.filter((c) => !joined.has(c.id));

  const Card = ({ c }: { c: Circle }) => (
    <li className="glass flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/app/connect/circles/${c.slug}`} className="display text-2xl hover:underline">{c.name}</Link>
        {c.kind === "elite" && <EliteBadge size={20} interactive={false} />}
      </div>
      {c.tagline && <p className="mt-1 text-sm text-muted">{c.tagline}</p>}
      <p className="mt-2 text-[0.7rem] uppercase tracking-wider text-faint">{CIRCLE_KIND_LABEL[c.kind] ?? c.kind}{c.eligibility === "couples" ? " · Couples only" : ""}</p>
      {live && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {joined.has(c.id) ? (
            <>
              <Link href={`/app/connect/circles/${c.slug}`} className="btn btn-gold btn-sm">Open circle</Link>
              <MemberForm action={couplesCircle}><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="leave" /><button className="btn btn-ghost btn-sm">Leave</button></MemberForm>
            </>
          ) : canJoin(c) ? (
            <MemberForm action={couplesCircle}><input type="hidden" name="circle_id" value={c.id} /><input type="hidden" name="op" value="join" /><button className="btn btn-gold btn-sm">Join</button></MemberForm>
          ) : (
            <p className="text-xs text-muted">{!activeCouple ? "Opens once your partner has joined your shared space." : "For couples with a verified Elite membership."}</p>
          )}
        </div>
      )}
    </li>
  );

  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — In Love is not open to members yet.</p>}
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">{brandName("in-love")} · Couples</p>
        <h1 className="display mt-3 text-3xl leading-snug sm:text-4xl">{brandName("couples-connection-community")}</h1>
        <p className="mt-2 max-w-2xl text-muted">Meaningful friendships, shared adventures and a supportive community beyond your own relationship. Meet other couples for double dates, travel and growing together.</p>
        <InLoveTabs tabs={COUPLES_TABS} />
      </section>

      {live && !activeCouple && (
        <section className="glass mt-6 p-6">
          <p className="eyebrow">How to begin</p>
          <p className="mt-2 text-sm">{brandName("couples-connection-circles")} are for couples whose partners have both joined their shared space. Invite your partner from Our Relationship; once they accept, you can each join.</p>
          <Link href="/app/relationships" className="btn btn-gold mt-4 w-full sm:w-auto">Go to Our Relationship</Link>
        </section>
      )}

      {myCircles.length > 0 && (
        <section className="mt-8">
          <h2 className="display text-2xl sm:text-3xl">My circles</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{myCircles.map((c) => <Card key={c.id} c={c} />)}</ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="display text-2xl sm:text-3xl">{brandName("couples-connection-circles")}</h2>
        <p className="mt-1 text-sm text-muted">Travel, newlyweds, entrepreneurial couples, empty nesters, couples over 50, date nights, marriage growth, local connections and shared adventures. Join as many as you like and leave whenever you choose.</p>
        {others.length === 0 ? <p className="glass mt-4 p-6 text-sm text-muted">{active.length ? "You've joined every circle here. Propose a new one below." : "No circles are open yet. Propose the first one below."}</p>
          : <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{others.map((c) => <Card key={c.id} c={c} />)}</ul>}
      </section>

      {live && activeCouple && (
        <MemberForm action={proposeCouplesCircle} className="glass mt-8 max-w-2xl space-y-3 p-6">
          <h2 className="display text-2xl">Propose a new circle</h2>
          <p className="text-sm text-muted">Start a community for couples around something you love. Our founder reviews every proposal; once approved, you&rsquo;ll host it.</p>
          <label className="block text-sm">Name<input name="name" required minLength={3} maxLength={80} className="field mt-1 w-full" /></label>
          <label className="block text-sm">One line about it<input name="tagline" maxLength={160} className="field mt-1 w-full" /></label>
          <label className="block text-sm">Description<textarea name="description" rows={3} maxLength={2000} className="field mt-1 w-full" /></label>
          <button className="btn btn-gold w-full sm:w-auto">Send for approval</button>
          {myProposals.length > 0 && <p className="text-xs text-muted">Awaiting approval: {myProposals.map((c) => c.name).join(", ")}</p>}
        </MemberForm>
      )}

      <section className="glass mt-8 p-6 text-sm">
        <p className="eyebrow">Your privacy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>You and your partner each keep your own account. Joining a circle never shares your private reflections, journals, Journey conversations or assessments.</li>
          <li>Never post exact travel dates, home addresses or live locations. Share plans in a circle&rsquo;s group messages only with couples you trust.</li>
          <li>This is a friendship community for couples, kept separate from singles matchmaking.</li>
          <li>If a couple ends, both partners leave {brandName("couples-connection-circles")} automatically.</li>
        </ul>
        <p className="mt-3">Looking for more? <Link href="/app/connect/circles" className="text-gold underline">{brandName("find-your-circle")}</Link> · <Link href="/app/relationships/calendar" className="text-gold underline">{brandName("our-calendar")}</Link></p>
      </section>
    </>
  );
}
