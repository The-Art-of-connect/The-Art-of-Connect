import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publishedContent } from "@/lib/sanctuary-server";
import { itemFor, MOODS, nextScenario, TOPIC_LABEL, type Content } from "@/lib/sanctuary";
import { LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { AwaitingContent, SanctuaryTabs } from "@/components/SanctuaryTabs";
import { addNote, answerScenario, saveEntry } from "@/app/actions/sanctuary";

export const metadata = { title: "My Daily Sanctuary" };
export const dynamic = "force-dynamic";

type Entry = { id: string; kind: string; mood: string | null; response: string | null; content_id: string | null };

/**
 * My Daily Sanctuary (founder directive 17): part of the complimentary Art of Becoming for every account.
 * Approved prewritten content only; no AI. Everything a member writes here is private to them.
 */
export default async function Sanctuary() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const day = new Date().toISOString().slice(0, 10);
  const [content, { data: entries }, { data: answered }] = await Promise.all([
    publishedContent(),
    live && db ? db.from("sanctuary_entries").select("id, kind, mood, response, content_id").eq("user_id", viewer.id).eq("day", day) : Promise.resolve({ data: [] }),
    live && db ? db.from("sanctuary_scenario_answers").select("content_id").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const mine = (entries ?? []) as Entry[];
  const done = (kind: string) => mine.find((e) => e.kind === kind);
  const pick = (kind: string) => itemFor(content, kind, day, viewer.id);
  const scenario = nextScenario(content, new Set(((answered ?? []) as { content_id: string }[]).map((a) => a.content_id)));
  const lesson = pick("lesson");

  const Practice = ({ kind, label, write = false, placeholder }: { kind: string; label: string; write?: boolean; placeholder?: string }) => {
    const item = pick(kind);
    const entry = done(kind);
    return (
      <div className="glass flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-2"><p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{label}</p>{entry && <span className="chip chip-live">Done</span>}</div>
        {item ? <p className="display mt-3 flex-1 border-l-2 border-gold/50 pl-3 text-xl italic text-gold-deep">{item.body}</p> : <div className="mt-3 flex-1"><AwaitingContent what={label.toLowerCase()} /></div>}
        {item && (
          <MemberForm action={saveEntry} className="mt-4">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="content_id" value={item.id} />
            {write && <textarea name="response" rows={3} maxLength={4000} defaultValue={entry?.response ?? ""} className="field mb-2 w-full" placeholder={placeholder ?? "A few private words (optional)"} />}
            <button className="btn btn-ghost btn-sm">{entry ? "Update" : write ? "Save privately" : "I’ve taken this in"}</button>
          </MemberForm>
        )}
      </div>
    );
  };

  return (
    <>
      <LuxHero eyebrow="The Art of Becoming · Free with every account" title="My Daily Sanctuary" tagline="Discover yourself. Find your people. Experience life together." />
      <SanctuaryTabs current="/app/sanctuary" />

      <LuxSection eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} title="This morning">
        <div className="grid gap-5 md:grid-cols-3">
          <Practice kind="manifestation" label="Morning manifestation" />
          <Practice kind="affirmation" label="Daily affirmation" />
          <Practice kind="intention" label="Morning intention" />
        </div>
      </LuxSection>

      <LuxSection eyebrow="Check in with yourself" title="How are you, really?">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass p-6">
            <p className="text-sm text-muted">{pick("checkin")?.body ?? "Name the feeling closest to how you are arriving today, without judging it."}</p>
            <MemberForm action={saveEntry} className="mt-4">
              <input type="hidden" name="kind" value="checkin" />
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How you feel">
                {MOODS.map(([k, l]) => (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="mood" value={k} defaultChecked={done("checkin")?.mood === k} className="peer sr-only" />
                    <span className="block rounded-full border border-line-strong px-3 py-1.5 text-sm text-muted peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{l}</span>
                  </label>
                ))}
              </div>
              <textarea name="response" rows={2} maxLength={4000} defaultValue={done("checkin")?.response ?? ""} className="field mt-3 w-full" placeholder="Anything you'd like to note (private, optional)" />
              <button className="btn btn-gold btn-sm mt-2">{done("checkin") ? "Update my check-in" : "Check in"}</button>
            </MemberForm>
          </div>
          <Practice kind="question" label="Today’s reflection question" write placeholder="Your private reflection" />
        </div>
      </LuxSection>

      <LuxSection eyebrow="Learn and discover" title="Today’s lesson and scenario">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass p-6">
            <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">Short life lesson{lesson?.topic ? ` · ${TOPIC_LABEL[lesson.topic]}` : ""}</p>
            {lesson ? (
              <>
                <p className="display mt-3 text-2xl">{lesson.title}</p>
                <p className="mt-2 line-clamp-4 text-sm text-muted">{lesson.body}</p>
                <Link href={`/app/sanctuary/library/${lesson.id}`} className="btn btn-ghost btn-sm mt-4">Read the lesson</Link>
              </>
            ) : <div className="mt-3"><AwaitingContent what="lesson" /></div>}
          </div>
          <ScenarioCard scenario={scenario} />
        </div>
      </LuxSection>

      <LuxSection eyebrow="Through the day" title="Gratitude, growth and accomplishments">
        <div className="grid gap-5 md:grid-cols-3">
          <NoteCard kind="gratitude" title="Gratitude" prompt={pick("gratitude")?.body ?? "What are you grateful for today?"} notes={mine.filter((e) => e.kind === "gratitude")} />
          <Practice kind="challenge" label="Today’s growth challenge" write placeholder="How did it go? (optional)" />
          <NoteCard kind="accomplishment" title="Accomplishments" prompt={pick("accomplishment")?.body ?? "What did you accomplish today, however small?"} notes={mine.filter((e) => e.kind === "accomplishment")} />
        </div>
      </LuxSection>

      <LuxSection eyebrow="Tonight" title="Evening reflection">
        <div className="max-w-2xl"><Practice kind="evening" label="Evening reflection" write placeholder="Your private evening reflection" /></div>
      </LuxSection>

      <div className="mt-10 space-y-4">
        <Notice>Everything you write in your Sanctuary is private to you. Content comes from lessons and reflections approved by The Art of Connect; no AI is used. These are educational activities for reflection, not clinical assessments.</Notice>
        <p className="text-sm text-muted">Curious what else is possible? <Link href="/app/discover" className="text-gold underline">Discover What&rsquo;s Possible</Link></p>
      </div>
      <SafetyFooter />
    </>
  );
}

function NoteCard({ kind, title, prompt, notes }: { kind: "gratitude" | "accomplishment"; title: string; prompt: string; notes: Entry[] }) {
  return (
    <div className="glass flex h-full flex-col p-6">
      <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{title}</p>
      <p className="mt-3 text-sm text-muted">{prompt}</p>
      {notes.length > 0 && <ul className="mt-3 space-y-1 text-sm">{notes.map((n) => <li key={n.id} className="flex gap-2"><span className="text-gold" aria-hidden="true">✦</span>{n.response}</li>)}</ul>}
      <MemberForm action={addNote} className="mt-auto pt-4">
        <input type="hidden" name="kind" value={kind} />
        <input name="response" maxLength={500} required className="field mb-2 w-full" placeholder={kind === "gratitude" ? "I'm grateful for…" : "Today I…"} />
        <button className="btn btn-ghost btn-sm">Add</button>
      </MemberForm>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Content | undefined }) {
  return (
    <div className="glass p-6">
      <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">Real-life self-discovery scenario</p>
      {scenario ? (
        <>
          {scenario.title && <p className="mt-3 text-sm text-muted">{scenario.title}</p>}
          <p className="display mt-1 text-2xl">{scenario.body}</p>
          <MemberForm action={answerScenario} className="mt-4 space-y-2">
            <input type="hidden" name="content_id" value={scenario.id} />
            {(scenario.options ?? []).map((o) => (
              <label key={o.key} className="block cursor-pointer">
                <input type="radio" name="choice" value={o.key} required className="peer sr-only" />
                <span className="block rounded-2xl border border-line px-4 py-3 text-sm peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{o.label}</span>
              </label>
            ))}
            <button className="btn btn-ghost btn-sm mt-2">Save my answer</button>
          </MemberForm>
          <p className="mt-3 text-xs text-faint">There are no right answers. Each scenario is asked once; you can revisit answers in Self-discovery.</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">You&rsquo;ve answered every scenario available right now. New ones appear as they&rsquo;re published. <Link href="/app/sanctuary/discover" className="text-gold underline">Review your answers</Link></p>
      )}
    </div>
  );
}
