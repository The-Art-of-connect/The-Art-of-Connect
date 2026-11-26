import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publishedContent } from "@/lib/sanctuary-server";
import { VISION_CATEGORIES, VISION_LABEL } from "@/lib/sanctuary";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";
import { addBecomingGoal, saveBecomingPlan, updateBecomingGoal } from "@/app/actions/circle";

export const metadata = { title: "Who Am I Becoming? · My Daily Sanctuary" };
export const dynamic = "force-dynamic";

const HORIZONS = [["1y", "My one-year goals"], ["5y", "My five-year goals"], ["10y", "My ten-year goals"]] as const;
type Goal = { id: string; horizon: string; area: string; title: string; why: string | null; first_step: string | null; status: string };

/** Who Am I Becoming? and My Future Self (directive 19, section 2). Private planning; no AI; no judgments. */
export default async function WhoAmIBecoming() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const [{ data: plan }, { data: goals }, content] = await Promise.all([
    live && db ? db.from("becoming_plans").select("becoming, future_self, growth_plan").eq("user_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
    live && db ? db.from("becoming_goals").select("id, horizon, area, title, why, first_step, status").eq("user_id", viewer.id).order("created_at") : Promise.resolve({ data: [] }),
    publishedContent(["lesson", "question"]),
  ]);
  const alignment = content.filter((c) => c.course === "who-am-i-becoming");
  const list = (goals ?? []) as Goal[];
  return (
    <>
      <LuxHero eyebrow="The Art of Becoming · Complimentary" title="Who Am I Becoming?" tagline="Not only who you are today, but who you are growing into." />
      <SanctuaryTabs current="/app/sanctuary/becoming" />

      <LuxSection eyebrow="My Future Self" title="The person I’m becoming">
        <MemberForm action={saveBecomingPlan} className="glass grid gap-4 p-6 lg:grid-cols-3">
          <label className="text-sm">Who am I becoming?<textarea name="becoming" rows={6} maxLength={3000} defaultValue={plan?.becoming ?? ""} className="field mt-1 w-full" placeholder="The qualities, values and ways of living I'm growing into…" /></label>
          <label className="text-sm">My future self, five years from now<textarea name="future_self" rows={6} maxLength={3000} defaultValue={plan?.future_self ?? ""} className="field mt-1 w-full" placeholder="A day in my life, how I feel, who is around me…" /></label>
          <label className="text-sm">My personal growth plan<textarea name="growth_plan" rows={6} maxLength={3000} defaultValue={plan?.growth_plan ?? ""} className="field mt-1 w-full" placeholder="What I'll practice, learn and let go of…" /></label>
          <div><button className="btn btn-gold">Save privately</button></div>
        </MemberForm>
      </LuxSection>

      {HORIZONS.map(([h, label]) => (
        <LuxSection key={h} eyebrow="Goals" title={label}>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.filter((g) => g.horizon === h).map((g) => (
              <li key={g.id} className={`glass p-5 ${g.status !== "active" ? "opacity-70" : ""}`}>
                <p className="text-xs text-gold-deep">{VISION_LABEL[g.area]}{g.status === "achieved" ? " · Achieved" : g.status === "released" ? " · Released" : ""}</p>
                <p className="mt-1 font-semibold">{g.title}</p>
                {g.why && <p className="mt-1 text-sm text-muted">{g.why}</p>}
                {g.first_step && <p className="mt-1 text-sm">First step: {g.first_step}</p>}
                <div className="mt-3 flex gap-4 text-xs">
                  {g.status === "active" ? (
                    <>
                      <MemberForm action={updateBecomingGoal}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="action" value="achieved" /><button className="text-gold underline">Mark achieved</button></MemberForm>
                      <MemberForm action={updateBecomingGoal}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="action" value="released" /><button className="text-muted underline">Release this goal</button></MemberForm>
                    </>
                  ) : <MemberForm action={updateBecomingGoal}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="action" value="active" /><button className="text-muted underline">Make active again</button></MemberForm>}
                  <MemberForm action={updateBecomingGoal}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="action" value="delete" /><button className="text-muted underline">Delete</button></MemberForm>
                </div>
              </li>
            ))}
          </ul>
          <MemberForm action={addBecomingGoal} className="mt-4 grid gap-2 rounded-2xl border border-line p-4 sm:grid-cols-[10rem_1fr_1fr_auto]">
            <input type="hidden" name="horizon" value={h} />
            <select name="area" className="field" aria-label="Area">{VISION_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <input name="title" required maxLength={200} className="field" placeholder="My goal" />
            <input name="first_step" maxLength={300} className="field" placeholder="My first step (optional)" />
            <button className="btn btn-ghost btn-sm">Add goal</button>
          </MemberForm>
        </LuxSection>
      ))}

      <LuxSection eyebrow="Reflect" title="Is my life aligned with who I’m becoming?" intro="Questions to consider your relationships, friendships, career and lifestyle. Only you can decide what is right for your life; these are for reflection, never judgments.">
        {alignment.length ? (
          <ul className="grid gap-3 md:grid-cols-2">{alignment.map((c) => (
            <li key={c.id} className="glass p-5">{c.kind === "lesson" ? <Link href={`/app/sanctuary/library/${c.id}`} className="block"><span className="text-xs text-gold-deep">Lesson</span><span className="display mt-1 block text-xl">{c.title}</span></Link> : <p className="display text-lg">{c.body}</p>}</li>
          ))}</ul>
        ) : <p className="text-sm text-muted">Reflections will appear here once The Art of Connect publishes them.</p>}
        <p className="mt-4 text-sm"><Link href="/app/sanctuary/vision" className="text-gold underline">Open My Vision Board</Link> · <Link href="/app/counseling/journal" className="text-gold underline">My private journal</Link></p>
      </LuxSection>
      <Notice>Everything here is private to you. Growing in a new direction is a normal part of life; if you&rsquo;d like support, our Counseling &amp; Wellness Center can connect you with qualified professionals.</Notice>
    </>
  );
}
