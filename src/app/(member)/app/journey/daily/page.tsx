import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GoldRule, LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { logPractice, saveGoal, setApproach, updateGoal } from "@/app/actions/journey-member";

export const metadata = { title: "My Daily Journey" };

const PRACTICES: { key: "manifestation" | "affirmation" | "intention" | "awareness" | "journal" | "evening"; kind: string; title: string; fallback: string }[] = [
  { key: "manifestation", kind: "manifestation", title: "Morning manifestation", fallback: "Today I move toward the life I'm building — one intentional choice at a time." },
  { key: "affirmation", kind: "affirmation", title: "Daily affirmation", fallback: "I am worthy of the love and respect I give to others." },
  { key: "intention", kind: "intention", title: "Daily intention", fallback: "I will have one honest conversation instead of avoiding it." },
  { key: "awareness", kind: "exercise", title: "Personal awareness exercise", fallback: "Pause three times today. Each time, name one feeling and one need." },
  { key: "journal", kind: "reflection", title: "Guided journaling", fallback: "What did I do today that the person I'm becoming would be proud of?" },
  { key: "evening", kind: "evening", title: "Evening reflection", fallback: "What can I release from today, and what do I want to carry into tomorrow?" },
];
const APPROACHES: [string, string][] = [["spiritual", "Spiritual"], ["secular", "Secular"], ["practical", "Practical"], ["blend", "A blend of each"]];

/** Deterministic daily pick, so the same member sees the same item all day and something new tomorrow. */
function pick<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

export default async function DailyJourney() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const live = Boolean(supabase && !isInsidePreview(viewer));
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: ms }, { data: library }, { data: goals }, { data: log }] = live
    ? await Promise.all([
        supabase!.from("journey_memory_settings").select("approach").eq("user_id", viewer.id).maybeSingle(),
        supabase!.from("journey_library").select("id, kind, approach, title, body").in("kind", ["manifestation", "affirmation", "intention", "exercise", "reflection", "evening"]),
        supabase!.from("journey_goals").select("id, title, why, next_step, target_date, progress, status").neq("status", "archived").order("created_at", { ascending: false }),
        supabase!.from("journey_practice_log").select("day, practice").gte("day", new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)),
      ])
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }];
  const approach = ms?.approach ?? "blend";
  const done = new Set((log ?? []).filter((l) => l.day === today).map((l) => l.practice));
  const weekCount = (log ?? []).length;
  return (
    <>
      <LuxHero eyebrow="My Journey" title="Your daily journey" tagline="Become. Believe. Connect. Thrive.">
        <MemberForm action={setApproach} className="max-w-2xl">
          <p className="text-xs tracking-[0.25em] text-gold uppercase">Your approach</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {APPROACHES.map(([k, l]) => (
              <button key={k} name="approach" value={k} className={`rounded-full px-4 py-2 text-sm transition ${approach === k ? "bg-gold font-semibold text-espresso" : "border border-line-strong text-muted hover:text-text"}`}>{l}</button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Journey honors your beliefs and never imposes one. Manifestations and affirmations are always tied to realistic goals and intentional actions — no outcome is ever promised.</p>
        </MemberForm>
      </LuxHero>

      <LuxSection eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} title="Today, from morning to evening">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICES.map((p) => {
            const options = (library ?? []).filter((x) => x.kind === p.kind && (x.approach === "all" || x.approach === approach || approach === "blend"));
            const item = pick(options, `${viewer.id}:${today}:${p.key}`);
            return (
              <div key={p.key} className="glass flex h-full flex-col p-6">
                <div className="flex items-center justify-between"><p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{p.title}</p>{done.has(p.key) && <span className="chip chip-live">Done</span>}</div>
                <p className="display mt-3 flex-1 border-l-2 border-gold/50 pl-3 text-xl italic text-gold-deep">{item?.body ?? p.fallback}</p>
                <MemberForm action={logPractice} className="mt-4">
                  <input type="hidden" name="practice" value={p.key} />
                  {p.key === "journal" || p.key === "evening" ? <textarea name="note" rows={2} maxLength={2000} className="field mb-2 w-full" placeholder="A few private words (optional)" /> : null}
                  <button className="btn btn-ghost btn-sm">{done.has(p.key) ? "Update" : "Mark complete"}</button>
                </MemberForm>
              </div>
            );
          })}
        </div>
        {!library?.length && <p className="mt-4 text-xs text-faint">Showing The Art of Connect&rsquo;s starter practices. Your daily content grows as new approved practices are added to the Journey Library.</p>}
      </LuxSection>

      <GoldRule />

      <LuxSection eyebrow="Over time" title="Goals and milestones" intro={`You've completed ${weekCount} practice${weekCount === 1 ? "" : "s"} in the last seven days.`}>
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <ul className="space-y-3">
            {(goals ?? []).map((g) => (
              <li key={g.id} className="glass p-5">
                <div className="flex items-start justify-between gap-3">
                  <span><span className="block font-semibold">{g.title}</span>{g.next_step && <span className="block text-sm text-muted">Next step: {g.next_step}</span>}</span>
                  {g.status === "achieved" && <span className="chip chip-live">Milestone reached</span>}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gold/15"><div className="h-full rounded-full bg-gold" style={{ width: `${g.progress}%` }} /></div>
                <MemberForm action={updateGoal} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <input type="range" name="progress" min={0} max={100} step={5} defaultValue={g.progress} className="flex-1 accent-[var(--champagne)]" aria-label="Progress" />
                  <button className="btn btn-ghost btn-sm">Save</button>
                </MemberForm>
              </li>
            ))}
            {!goals?.length && <li className="glass p-6 text-sm text-muted">Set your first goal — Journey will help you connect your daily practices to it.</li>}
          </ul>
          <div className="theme-dark h-fit rounded-[1.5rem] p-6" style={{ background: "var(--ink)" }}>
            <MemberForm action={saveGoal} className="space-y-3">
              <p className="display text-2xl text-gold-bright">A new goal</p>
              <input name="title" required maxLength={160} className="field w-full" placeholder="What would you like to achieve?" />
              <textarea name="why" rows={2} maxLength={1000} className="field w-full" placeholder="Why it matters to you" />
              <input name="next_step" maxLength={300} className="field w-full" placeholder="Your first small step" />
              <label className="block text-xs text-muted">Target date (optional)<input type="date" name="target_date" className="field mt-1 w-full" /></label>
              <button className="btn btn-gold w-full">Save goal</button>
            </MemberForm>
          </div>
        </div>
      </LuxSection>
      <div className="mt-10"><Notice>Your daily experiences come from content approved by The Art of Connect and use no AI processing. Asking Journey about them in chat uses your Journey allowance.</Notice></div>
      <SafetyFooter />
    </>
  );
}
