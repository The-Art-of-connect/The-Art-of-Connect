import Link from "next/link";
import { getViewer, hasPaidAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, CATEGORY_LABEL, nextSlot, topicOpen, type Topic } from "@/lib/circle";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { LocalTime } from "@/components/LocalTime";
import { PossibilitiesGrid } from "@/components/PossibilitiesGrid";
import { suggestTopic } from "@/app/actions/circle";

export const metadata = { title: "The Becoming Circle" };
export const dynamic = "force-dynamic";

/**
 * The Becoming Circle (founder directive 19): a complimentary open discussion with a new featured topic every four
 * hours. Free and paid members take part in writing now; moderated live audio arrives in phase two.
 */
export default async function BecomingCircle() {
  const viewer = (await getViewer())!;
  const db = await createClient();
  const now = new Date();
  const { data } = db ? await db.from("circle_topics").select("id, title, prompt, category, slot_start, open_hours, paused, closed_at, room, status")
    .eq("room", "becoming").eq("status", "scheduled").gte("slot_start", new Date(now.getTime() - 7 * 86_400_000).toISOString()).order("slot_start") : { data: [] };
  const topics = ((data ?? []) as Topic[]).sort((a, b) => Date.parse(a.slot_start!) - Date.parse(b.slot_start!));
  const started = topics.filter((t) => Date.parse(t.slot_start!) <= now.getTime());
  const featured = started.at(-1);
  const stillOpen = started.slice(0, -1).filter((t) => topicOpen(t, now)).reverse();
  const upcoming = topics.filter((t) => Date.parse(t.slot_start!) > now.getTime()).slice(0, 6);
  const paid = hasPaidAccess(viewer);
  return (
    <>
      <LuxHero eyebrow="The Art of Becoming · Complimentary" title="The Becoming Circle" tagline="Every participant deserves to be heard. Every participant deserves respect." />

      <LuxSection eyebrow="Featured now" title={featured ? featured.title : "The next conversation is being prepared"}>
        {featured ? (
          <Link href={`/app/circle/${featured.id}`} className="theme-dark block rounded-[28px] p-7 transition hover:opacity-95" style={{ background: "#241c17" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#f0c98a]">{CATEGORY_LABEL[featured.category]} · {topicOpen(featured, now) ? "Open now" : featured.paused ? "Paused by a moderator" : "Closed"}</p>
            <p className="mt-3 max-w-3xl text-ivory/85">{featured.prompt}</p>
            <span className="btn btn-gold mt-6">Join the conversation</span>
          </Link>
        ) : (
          <p className="glass p-6 text-sm text-muted">New topics appear every four hours once they&rsquo;re approved. The next begins at <LocalTime iso={nextSlot(now).toISOString()} />.</p>
        )}
        <p className="mt-4 text-sm text-muted">Next featured topic: <LocalTime iso={nextSlot(now).toISOString()} />. You can stay in any open discussion as long as you like.</p>
      </LuxSection>

      {stillOpen.length > 0 && (
        <LuxSection eyebrow="Still open" title="Earlier conversations">
          <ul className="grid gap-3 md:grid-cols-2">{stillOpen.map((t) => (
            <li key={t.id}><Link href={`/app/circle/${t.id}`} className="glass block p-5 hover:border-gold"><span className="text-xs text-gold-deep">{CATEGORY_LABEL[t.category]} · began <LocalTime iso={t.slot_start!} /></span><span className="display mt-1 block text-xl">{t.title}</span></Link></li>
          ))}</ul>
        </LuxSection>
      )}

      <LuxSection eyebrow="Coming up" title="Upcoming topics">
        {upcoming.length ? (
          <ul className="grid gap-3 md:grid-cols-3">{upcoming.map((t) => (
            <li key={t.id} className="glass p-5"><span className="text-xs text-gold-deep"><LocalTime iso={t.slot_start!} /> · {CATEGORY_LABEL[t.category]}</span><span className="mt-1 block font-semibold">{t.title}</span></li>
          ))}</ul>
        ) : <p className="text-sm text-muted">Upcoming topics will appear here once they&rsquo;re scheduled.</p>}
      </LuxSection>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <MemberForm action={suggestTopic} className="glass space-y-3 p-6">
          <p className="display text-2xl">Suggest a future topic</p>
          <p className="text-sm text-muted">What would you love to discuss? Our team reviews every suggestion.</p>
          <input name="title" required minLength={5} maxLength={160} className="field w-full" placeholder="e.g. Can you outgrow someone you still love?" />
          <select name="category" className="field w-full" aria-label="Category">{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <textarea name="note" rows={2} maxLength={1000} className="field w-full" placeholder="Why it matters (optional)" />
          <button className="btn btn-gold btn-sm">Suggest this topic</button>
        </MemberForm>
        <div className="glass p-6">
          <p className="display text-2xl">How the Circle works</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>✦ A new featured topic every four hours, six a day.</li>
            <li>✦ Share perspectives, ask questions and vote in polls.</li>
            <li>✦ Authorized human moderators guide every discussion.</li>
            <li>✦ Live audio with two-minute speaking turns is coming soon.</li>
            <li>✦ Personal contact details are never shared; the Safety Shield protects everyone.</li>
          </ul>
          {!paid && <p className="mt-4 text-sm">Specialized discussion lounges, connections and private meetings are part of paid memberships. <Link href="/app/membership?locked=connect" className="text-gold underline">Explore memberships and the 15-day trial</Link></p>}
        </div>
      </div>

      <div className="mt-12"><PossibilitiesGrid paid={paid} /></div>
      <div className="mt-8"><Notice>The Becoming Circle follows our Community Standards. Be respectful, keep personal details private and report anything concerning. Moderators may hide comments or remove participants.</Notice></div>
    </>
  );
}
