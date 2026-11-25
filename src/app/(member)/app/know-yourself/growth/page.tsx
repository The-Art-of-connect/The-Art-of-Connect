import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/who-am-i";
import { saveDiscoveryGoal } from "@/app/actions/who-am-i";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "My growth plan" };
export const dynamic = "force-dynamic";

const AREA: Record<string, string> = { self: "Myself", work: "Work & business", life: "Life", love: "Love" };
const PROMPT = Object.fromEntries(MODULES.flatMap((m) => m.questions.map((q) => [q.key, q.prompt])));

export default async function Growth() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const [{ data: goals }, { data: history }] = await Promise.all([
    supabase.from("discovery_goals").select("*").eq("user_id", viewer.id).order("created_at"),
    supabase.from("discovery_history").select("question_key, answer, choices, recorded_at").eq("user_id", viewer.id).order("recorded_at"),
  ]);
  // Questions answered more than once: first answer vs. latest answer.
  const byKey = new Map<string, NonNullable<typeof history>>();
  for (const h of history ?? []) byKey.set(h.question_key, [...(byKey.get(h.question_key) ?? []), h]);
  const changes = [...byKey.entries()].filter(([, v]) => v.length > 1);
  const text = (h: { answer: string | null; choices: string[] | null }) => h.answer ?? h.choices?.join(", ") ?? "";
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <Link href="/app/know-yourself" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold"><span aria-hidden="true">←</span> The Art of Knowing Yourself</Link>
      <p className="eyebrow mt-6">Grow yourself</p>
      <h1 className="display mt-2 text-5xl">My growth plan</h1>
      <p className="mt-3 max-w-2xl text-muted">Personal development goals, set by you, for you. Private — only you can see them.</p>

      <section className="glass mt-8 p-6 sm:p-8">
        <h2 className="display text-3xl">My goals</h2>
        <ul className="mt-4 space-y-3">
          {(goals ?? []).map((g) => (
            <li key={g.id} className={`rounded-2xl border p-4 ${g.status === "achieved" ? "border-champagne bg-champagne/20" : "border-line"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{g.status === "achieved" ? "✓ " : ""}{g.title}</p>
                <span className="text-xs text-muted">{AREA[g.area]}{g.target_date ? ` · by ${g.target_date}` : ""}</span>
              </div>
              {g.why && <p className="mt-1 text-sm text-muted">Why it matters: {g.why}</p>}
              {g.next_step && <p className="mt-1 text-sm">Next step: {g.next_step}</p>}
              <ActionForm action={saveDiscoveryGoal} className="mt-3 flex flex-wrap gap-2 text-xs">
                <input type="hidden" name="id" value={g.id} />
                {g.status !== "achieved" && <button name="status" value="achieved" className="btn btn-gold btn-sm">Mark achieved</button>}
                {g.status === "active" && <button name="status" value="paused" className="btn btn-ghost btn-sm">Pause</button>}
                {g.status !== "active" && <button name="status" value="active" className="btn btn-ghost btn-sm">Make active</button>}
                <button name="delete" value="1" className="px-2 text-muted underline">Remove</button>
              </ActionForm>
            </li>
          ))}
          {!goals?.length && <li className="text-sm text-muted">No goals yet. Start with one small, meaningful goal.</li>}
        </ul>
        <ActionForm action={saveDiscoveryGoal} className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          <input name="title" required minLength={2} maxLength={200} placeholder="My goal — e.g. Speak up for my needs calmly" className="field sm:col-span-2" aria-label="Goal" />
          <select name="area" className="field" aria-label="Area"><option value="self">Myself</option><option value="work">Work & business</option><option value="life">Life</option><option value="love">Love</option></select>
          <input name="target_date" type="date" className="field" aria-label="Target date" />
          <input name="why" maxLength={2000} placeholder="Why it matters to me" className="field sm:col-span-2" aria-label="Why it matters" />
          <input name="next_step" maxLength={1000} placeholder="My next small step" className="field sm:col-span-2" aria-label="Next step" />
          <button className="btn btn-gold sm:col-span-2 sm:justify-self-start">Add to my growth plan</button>
        </ActionForm>
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl">How I’ve grown</h2>
        <p className="mt-2 text-sm text-muted">When you update an answer, your earlier words are kept here privately so you can see how far you’ve come.</p>
        {changes.length ? (
          <ul className="mt-5 space-y-4">
            {changes.map(([key, v]) => (
              <li key={key} className="glass p-6">
                <p className="display text-xl">{PROMPT[key] ?? key}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <p className="rounded-xl border border-line p-3 text-sm"><span className="block text-xs text-muted">Then · {date(v[0].recorded_at)}</span>{text(v[0])}</p>
                  <p className="rounded-xl border border-champagne bg-champagne/15 p-3 text-sm"><span className="block text-xs text-gold-deep">Now · {date(v[v.length - 1].recorded_at)}</span>{text(v[v.length - 1])}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm text-muted">As you revisit your answers over time, your growth will appear here.</p>
        )}
      </section>
    </>
  );
}
