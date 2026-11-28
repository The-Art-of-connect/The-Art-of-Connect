import Image from "next/image";
import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { MemberMarks } from "@/components/MembershipEmblem";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { COUPLES_TABS, INTENTS, SINGLES_TABS, questionFor } from "@/lib/in-love";
import { addGoal, expressInterest, invitePartner, setGoalStatus } from "@/app/actions/in-love";
import { brandName } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "In Love" };

type Match = { user_id: string; first_name: string | null; age: number | null; city: string | null; intent: string | null; headline: string | null; about: string | null; reasons: string[]; distinction: string | null; identity_verified: boolean };

/**
 * In Love (founder directive 38). Singles land on Discover; couples land on their shared space. Everything previously
 * available (onboarding, readiness, love languages, The Exclusive Connection, calendar) is reused and linked below.
 */
export default async function InLove({ searchParams }: { searchParams: Promise<{ welcome?: string; as?: string }> }) {
  const { viewer, preview } = await requireExperience("relationships");
  const { welcome, as } = await searchParams;
  const db = isInsidePreview(viewer) ? null : await createClient();
  const rel = db?.schema("relationships");
  const { data: cm } = rel ? await rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle() : { data: null };
  // The owner review preview can show either layout (?as=couples); members always see their own.
  const couples = Boolean(cm) || viewer.society === "couples" || (isInsidePreview(viewer) && as === "couples");
  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — In Love is not open to members yet.</p>}
      {couples ? <Couples coupleId={(cm?.couple_id as string | undefined) ?? null} welcome={welcome === "1"} viewerId={viewer.id} /> : <Singles viewerId={viewer.id} live={Boolean(rel)} />}
    </>
  );
}

async function Singles({ viewerId, live }: { viewerId: string; live: boolean }) {
  const db = live ? await createClient() : null;
  const rel = db?.schema("relationships");
  const [{ data: mine }, { data: list }] = rel
    ? await Promise.all([rel.from("profiles").select("is_visible, headline").eq("user_id", viewerId).maybeSingle(), rel.rpc("discover", { p_limit: 24 })])
    : [{ data: null }, { data: [] }];
  const matches = (list ?? []) as Match[];
  return (
    <>
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">{brandName("brand")} · {brandName("in-love")}</p>
        <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">Meaningful connections begin with you.</h1>
        <InLoveTabs tabs={SINGLES_TABS} />
      </section>

      {!mine && (
        <Link href="/app/relationships/profile" className="glass mt-6 flex items-center justify-between gap-4 p-5">
          <span><span className="block font-semibold">Create your In Love profile</span><span className="block text-sm text-muted">A few honest lines and what you&rsquo;re looking for. You choose when you&rsquo;re visible.</span></span>
          <span className="btn btn-gold btn-sm shrink-0">Begin</span>
        </Link>
      )}
      {mine && !mine.is_visible && (
        <Link href="/app/relationships/profile" className="glass mt-6 block p-5 text-sm"><span className="font-semibold">Your profile is private.</span> <span className="text-muted">Other singles can&rsquo;t see you until you choose to be visible in Preferences.</span></Link>
      )}

      <h2 className="display mt-10 text-3xl">Your recommended connections</h2>
      {matches.length === 0 ? (
        <div className="glass mt-4 p-8 text-center text-sm text-muted">
          No recommendations yet. As more verified singles join and share their profiles, they&rsquo;ll appear here.
          <span className="mt-3 block">Meanwhile, complete <Link href="/app/readiness" className="text-gold underline">your Relationship Readiness Profile</Link> and <Link href="/app/relationships/love-languages" className="text-gold underline">your Love Language Profile</Link>.</span>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <li key={m.user_id} className="glass flex flex-col p-5">
              <p className="flex flex-wrap items-center gap-2 text-xl font-semibold">{m.first_name ?? "A member"}{m.age ? `, ${m.age}` : ""}<MemberMarks distinction={m.distinction} verified={m.identity_verified} size={16} /></p>
              <p className="text-sm text-muted">{[m.headline, m.city].filter(Boolean).join(" · ")}</p>
              {m.reasons.length > 0 && <p className="mt-3 font-semibold text-gold-deep">{m.reasons.length >= 2 ? "Strong alignment" : "Worth meeting"}</p>}
              <ul className="text-sm text-muted">{m.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>
              {m.intent && <p className="mt-2 text-xs text-muted">Looking for: {INTENTS[m.intent] ?? m.intent}</p>}
              {m.about && <details className="mt-3 text-sm"><summary className="cursor-pointer text-gold-deep">View profile</summary><p className="mt-2 whitespace-pre-line">{m.about}</p></details>}
              <MemberForm action={expressInterest} className="mt-auto pt-4"><input type="hidden" name="to" value={m.user_id} /><button className="btn btn-gold btn-sm w-full">I&rsquo;d like to connect</button></MemberForm>
            </li>
          ))}
        </ul>
      )}

      <Link href="/app/journey" className="glass mt-6 flex items-center justify-between gap-4 p-5">
        <span><span className="block font-semibold">Ask Journey</span><span className="block text-sm text-muted">Understand your compatibility and what you&rsquo;re looking for.</span></span>
        <span aria-hidden="true" className="text-gold">›</span>
      </Link>

      <MoreForYou items={[
        { href: "/app/relationships/onboarding", title: "Your Personal Society journey", line: "Welcome, understanding you, readiness and compatibility." },
        { href: "/app/readiness", title: "Your Relationship Readiness Profile", line: "Strengths, growth areas and next steps." },
        { href: "/app/relationships/love-languages", title: "Your Love Language Profile", line: "How you give and receive love." },
        { href: "/app/relationships/exclusive", title: "The Exclusive Connection", line: "When you both choose to focus on each other." },
        { href: "/app/verify", title: "Identity verification", line: "Required before matchmaking, for everyone's safety." },
      ]} />
    </>
  );
}

async function Couples({ coupleId, welcome, viewerId }: { coupleId: string | null; welcome: boolean; viewerId: string }) {
  const db = coupleId ? await createClient() : null;
  const rel = db?.schema("relationships");
  const [{ data: members }, { data: invites }, { data: goals }] = rel && coupleId
    ? await Promise.all([
        rel.from("couple_members").select("user_id").eq("couple_id", coupleId),
        rel.from("partner_invitations").select("invitee_email, status, expires_at").eq("couple_id", coupleId).eq("status", "pending"),
        rel.from("couple_goals").select("id, title, details, status").eq("couple_id", coupleId).neq("status", "archived").order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const partnerJoined = (members ?? []).some((m) => m.user_id !== viewerId);
  const pending = (invites ?? [])[0];
  const today = questionFor();
  return (
    <>
      {welcome && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm">Welcome to your shared space. Your personal journal, reflections and discoveries remain yours alone.</p>}
      <section className="overflow-hidden rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] shadow-sm">
        <div className="px-5 pt-7 sm:px-9"><p className="eyebrow">{brandName("brand")} · {brandName("in-love")}</p></div>
        <div className="relative mx-5 mt-4 aspect-[16/9] overflow-hidden rounded-[1.5rem] sm:mx-9"><Image src="/images/library/love/sunlit-anniversary.webp" alt="A couple celebrating in warm afternoon light" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" priority /></div>
        <div className="px-5 pb-2 pt-5 sm:px-9">
          <h1 className="display text-4xl">Growing Together</h1>
          <p className="mt-1 text-muted">Two individuals. One intentional relationship.</p>
          <InLoveTabs tabs={COUPLES_TABS} />
        </div>
      </section>

      {!partnerJoined && (
        <section className="glass mt-6 p-6">
          {pending ? (
            <><p className="eyebrow">Invitation pending</p><p className="mt-2 text-sm">We&rsquo;ve invited {pending.invitee_email}. Your shared space opens when your partner accepts. The link expires on {new Date(pending.expires_at).toLocaleDateString("en-US", { dateStyle: "long" })}.</p></>
          ) : (
            <>
              <p className="eyebrow">Invite your partner</p>
              <p className="mt-2 text-sm text-muted">A secure invitation that works only for your partner&rsquo;s email. Your own journal, reflections and personal discoveries stay private to you.</p>
              <MemberForm action={invitePartner} className="mt-4 flex flex-col gap-2 sm:flex-row"><input name="email" type="email" required placeholder="Your partner's email" className="field flex-1" aria-label="Your partner's email" /><button className="btn btn-gold">Send invitation</button></MemberForm>
            </>
          )}
        </section>
      )}

      <section className="glass mt-6 p-6">
        <p className="eyebrow">Today&rsquo;s connection</p>
        <h2 className="display mt-2 text-3xl leading-snug">{today.q}</h2>
        <p className="mt-2 text-muted">{today.hint}</p>
        <Link href="/app/relationships/checkin" className="btn btn-gold mt-5 w-full sm:w-auto">Begin together</Link>
      </section>

      <ul className="mt-6 grid gap-3">
        {[
          { href: "/app/relationships/love-languages", title: "Five Love Languages", line: "Understand how your partner receives love." },
          { href: "/app/relationships/calendar", title: "Our Calendar", line: "Date nights and plans, with each partner's schedule kept private." },
          { href: "/app/journey", title: "Journey for couples", line: "Communicate intentionally and plan meaningful moments." },
          { href: "/app/know-yourself/emotional-intelligence", title: "Emotional intelligence", line: "Respond with intention, especially in hard moments." },
          { href: "/app/wellness", title: brandName("counseling-center"), line: "Consent-based referrals to counselors and coaches." },
        ].map((l) => (
          <li key={l.href}><Link href={l.href} className="glass flex items-center justify-between gap-4 p-5"><span><span className="block font-semibold">{l.title}</span><span className="block text-sm text-muted">{l.line}</span></span><span aria-hidden="true" className="text-gold">›</span></Link></li>
        ))}
      </ul>

      <section className="glass mt-6 p-6">
        <p className="eyebrow">Our shared goals</p>
        {(goals ?? []).length === 0 ? <p className="mt-2 text-sm text-muted">Create your future together: add a goal you both want to work toward.</p> : (
          <ul className="mt-3 divide-y divide-line">{(goals ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-3">
              <span><span className={`block font-semibold ${g.status === "achieved" ? "text-gold-deep" : ""}`}>{g.title}{g.status === "achieved" ? " · achieved" : ""}</span>{g.details && <span className="block text-sm text-muted">{g.details}</span>}</span>
              {g.status === "active" && <MemberForm action={setGoalStatus}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="status" value="achieved" /><button className="btn btn-ghost btn-sm">We did it</button></MemberForm>}
            </li>
          ))}</ul>
        )}
        {partnerJoined && <MemberForm action={addGoal} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><input name="title" required maxLength={120} placeholder="A goal for the two of you" className="field" aria-label="Shared goal" /><button className="btn btn-gold">Add</button></MemberForm>}
      </section>
      <p className="mt-6 text-center text-xs text-muted">Each of you keeps your own journal, reflections and discoveries. Only what you choose to share appears here.</p>
    </>
  );
}

function MoreForYou({ items }: { items: { href: string; title: string; line: string }[] }) {
  return (
    <section className="mt-10">
      <p className="eyebrow">More for you</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{items.map((l) => (
        <li key={l.href}><Link href={l.href} className="glass flex h-full items-center justify-between gap-4 p-5"><span><span className="block font-semibold">{l.title}</span><span className="block text-sm text-muted">{l.line}</span></span><span aria-hidden="true" className="text-gold">›</span></Link></li>
      ))}</ul>
    </section>
  );
}
