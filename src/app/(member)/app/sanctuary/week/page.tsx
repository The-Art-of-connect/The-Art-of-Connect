import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publishedContent } from "@/lib/sanctuary-server";
import { itemFor, MOOD_LABEL, monthStart, summarize, weekStart } from "@/lib/sanctuary";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { AwaitingContent, SanctuaryTabs } from "@/components/SanctuaryTabs";
import { deleteLetter, saveEntry, writeLetter } from "@/app/actions/sanctuary";

export const metadata = { title: "This week & month · My Daily Sanctuary" };
export const dynamic = "force-dynamic";

type E = { id: string; kind: string; mood: string | null; day: string; response: string | null };

/** Weekly and monthly reflection with deterministic summaries of the member's own entries (no AI, no judgments). */
export default async function SanctuaryWeek() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const now = new Date();
  const week = weekStart(now), month = monthStart(now);
  const since = new Date(Math.min(Date.parse(week), Date.parse(month))).toISOString().slice(0, 10);
  const [content, { data: entries }, { data: goals }, { data: letters }] = await Promise.all([
    publishedContent(["weekly", "monthly"]),
    live && db ? db.from("sanctuary_entries").select("id, kind, mood, day, response").eq("user_id", viewer.id).gte("day", since).order("day", { ascending: false }) : Promise.resolve({ data: [] }),
    live && db ? db.from("journey_goals").select("id, title, progress, status, target_date").neq("status", "archived").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    live && db ? db.from("future_letters").select("id, body, deliver_on, delivered_at, created_at").eq("user_id", viewer.id).order("deliver_on") : Promise.resolve({ data: [] }),
  ]);
  const all = (entries ?? []) as E[];
  const thisWeek = all.filter((e) => e.day >= week), thisMonth = all.filter((e) => e.day >= month);
  const ws = summarize(thisWeek), ms = summarize(thisMonth);
  const weekly = thisWeek.find((e) => e.kind === "weekly" && e.day === week);
  const monthly = thisMonth.find((e) => e.kind === "monthly" && e.day === month);
  const today = now.toISOString().slice(0, 10);
  const opened = (letters ?? []).filter((l) => l.deliver_on <= today);
  const sealed = (letters ?? []).filter((l) => l.deliver_on > today);

  const Summary = ({ s, label }: { s: ReturnType<typeof summarize>; label: string }) => (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
      {[["Days you visited", s.daysPresent], ["Check-ins", s.checkins], ["Gratitude notes", s.gratitude], ["Accomplishments", s.accomplishments], ["Challenges", s.challenges], ["Lessons", s.lessons]].map(([k, v]) => (
        <div key={String(k)} className="rounded-2xl border border-line p-3"><dt className="text-xs text-faint">{k}</dt><dd className="display text-2xl">{v}</dd></div>
      ))}
      <p className="col-span-full text-xs text-muted">{s.topMood ? `The feeling you named most ${label}: ${MOOD_LABEL[s.topMood]}. Every feeling is welcome; this is simply what you noticed.` : `No check-ins ${label} yet.`}</p>
    </dl>
  );

  const Reflection = ({ kind, dayKey, entry, label }: { kind: "weekly" | "monthly"; dayKey: string; entry?: E; label: string }) => {
    const prompt = itemFor(content, kind, dayKey, viewer.id);
    return (
      <div className="glass p-6">
        <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{label}</p>
        {prompt ? (
          <MemberForm action={saveEntry} className="mt-3">
            <p className="display text-xl">{prompt.body}</p>
            <input type="hidden" name="kind" value={kind} /><input type="hidden" name="day" value={dayKey} /><input type="hidden" name="content_id" value={prompt.id} />
            <textarea name="response" rows={5} maxLength={4000} defaultValue={entry?.response ?? ""} className="field mt-3 w-full" placeholder="Your private reflection" />
            <button className="btn btn-ghost btn-sm mt-2">{entry ? "Update" : "Save privately"}</button>
          </MemberForm>
        ) : <div className="mt-3"><AwaitingContent what={label.toLowerCase()} /></div>}
      </div>
    );
  };

  return (
    <>
      <LuxHero eyebrow="My Daily Sanctuary" title="This week & month" tagline="Notice how far you’ve come." />
      <SanctuaryTabs current="/app/sanctuary/week" />

      <LuxSection eyebrow={`Week of ${new Date(week).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`} title="Your week">
        <div className="grid gap-5 lg:grid-cols-2"><div className="glass p-6"><Summary s={ws} label="this week" /></div><Reflection kind="weekly" dayKey={week} entry={weekly} label="Weekly reflection" /></div>
      </LuxSection>

      <LuxSection eyebrow={now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} title="Your month">
        <div className="grid gap-5 lg:grid-cols-2"><div className="glass p-6"><Summary s={ms} label="this month" />
          {thisMonth.some((e) => e.kind === "accomplishment") && (
            <div className="mt-5"><p className="text-xs tracking-[0.2em] text-gold-deep uppercase">Accomplishments this month</p>
              <ul className="mt-2 space-y-1 text-sm">{thisMonth.filter((e) => e.kind === "accomplishment").map((e) => <li key={e.id} className="flex gap-2"><span className="text-gold" aria-hidden="true">✦</span>{e.response}</li>)}</ul></div>
          )}</div>
          <Reflection kind="monthly" dayKey={month} entry={monthly} label="Monthly reflection" /></div>
      </LuxSection>

      <LuxSection eyebrow="Goal review" title="Where your goals stand" intro="Your goals from My Daily Journey. Adjust progress there whenever you like.">
        <ul className="grid gap-3 md:grid-cols-2">
          {(goals ?? []).map((g) => (
            <li key={g.id} className="glass p-5"><p className="font-semibold">{g.title}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gold/15"><div className="h-full rounded-full bg-gold" style={{ width: `${g.progress}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{g.status === "achieved" ? "Achieved" : `${g.progress}% of the way`}{g.target_date ? ` · target ${g.target_date}` : ""}</p></li>
          ))}
          {!goals?.length && <li className="glass p-5 text-sm text-muted">No goals yet. <Link href="/app/journey/daily" className="text-gold underline">Set your first goal</Link> or add one to <Link href="/app/sanctuary/vision" className="text-gold underline">My Vision Board</Link>.</li>}
        </ul>
        <p className="mt-4 text-sm"><Link href="/app/know-yourself/portfolio" className="text-gold underline">Review my Discovery Portfolio</Link></p>
      </LuxSection>

      <LuxSection eyebrow="A gift across time" title="Letters to my future self" intro="Write to the person you're becoming. Your letter stays sealed until the date you choose; we'll email you when it opens.">
        <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
          <ul className="space-y-3">
            {opened.map((l) => (
              <li key={l.id} className="glass p-5"><p className="text-xs text-gold-deep">Written {new Date(l.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}</p><p className="mt-2 whitespace-pre-line text-sm">{l.body}</p>
                <MemberForm action={deleteLetter} className="mt-3"><input type="hidden" name="id" value={l.id} /><button className="text-xs text-muted underline">Remove</button></MemberForm></li>
            ))}
            {sealed.map((l) => <li key={l.id} className="glass flex items-center justify-between p-5 text-sm"><span>✉ Sealed until {new Date(l.deliver_on).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</span></li>)}
            {!letters?.length && <li className="glass p-5 text-sm text-muted">No letters yet.</li>}
          </ul>
          <MemberForm action={writeLetter} className="glass space-y-3 p-6">
            <textarea name="body" rows={7} maxLength={8000} required className="field w-full" placeholder="Dear future me…" />
            <label className="block text-xs text-muted">Open on<input type="date" name="deliver_on" required min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)} className="field mt-1 w-full" /></label>
            <button className="btn btn-gold w-full">Seal my letter</button>
          </MemberForm>
        </div>
      </LuxSection>
      <Notice>Summaries are simple counts of your own entries, private to you. They are not assessments.</Notice>
    </>
  );
}
