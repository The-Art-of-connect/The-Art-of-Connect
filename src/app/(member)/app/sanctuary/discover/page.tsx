import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { discoverState, publishedContent } from "@/lib/sanctuary-server";
import { INTERESTS } from "@/lib/social";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { ReadinessCard } from "@/components/ReadinessCard";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";
import { answerScenario, forgetScenario, saveSanctuarySettings } from "@/app/actions/sanctuary";

export const metadata = { title: "Self-discovery · My Daily Sanctuary" };
export const dynamic = "force-dynamic";

/** Progressive self-discovery: scenarios asked once, revisited only by choice, used only with consent. */
export default async function SanctuaryDiscover() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const [scenarios, state, { data: answers }] = await Promise.all([
    publishedContent(["scenario"]),
    discoverState(viewer.id, viewer.society ?? null),
    live && db ? db.from("sanctuary_scenario_answers").select("content_id, choice").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map(((answers ?? []) as { content_id: string; choice: string }[]).map((a) => [a.content_id, a.choice]));
  const open = scenarios.filter((s) => !byId.has(s.id));
  const done = scenarios.filter((s) => byId.has(s.id));
  return (
    <>
      <LuxHero eyebrow="My Daily Sanctuary" title="Self-discovery" tagline="Understand yourself first, at your own pace." />
      <SanctuaryTabs current="/app/sanctuary/discover" />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <LuxSection eyebrow="Real-life scenarios" title={open.length ? `${open.length} to explore` : "You're all caught up"} intro="Choose what you would most likely do. There are no right answers; these are educational reflections, not clinical assessments or judgments of your personality.">
            <div className="space-y-4">
              {open.map((s) => (
                <MemberForm key={s.id} action={answerScenario} className="glass p-6">
                  {s.title && <p className="text-sm text-muted">{s.title}</p>}
                  <p className="display mt-1 text-xl">{s.body}</p>
                  <input type="hidden" name="content_id" value={s.id} />
                  <div className="mt-3 space-y-2">{(s.options ?? []).map((o) => (
                    <label key={o.key} className="block cursor-pointer"><input type="radio" name="choice" value={o.key} required className="peer sr-only" />
                      <span className="block rounded-2xl border border-line px-4 py-3 text-sm peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{o.label}</span></label>
                  ))}</div>
                  <button className="btn btn-ghost btn-sm mt-3">Save my answer</button>
                </MemberForm>
              ))}
              {!scenarios.length && <p className="glass p-6 text-sm text-muted">Scenarios will appear here once The Art of Connect publishes them.</p>}
            </div>
          </LuxSection>
          {done.length > 0 && (
            <LuxSection eyebrow="Your answers" title="What you've discovered" intro="Only you can see these. Revisit any answer whenever you like.">
              <ul className="space-y-3">
                {done.map((s) => {
                  const o = s.options?.find((x) => x.key === byId.get(s.id));
                  return (
                    <li key={s.id} className="glass p-5">
                      <p className="text-sm text-muted">{s.body}</p>
                      <p className="mt-1 font-semibold">{o?.label}</p>
                      {o?.insight && <p className="mt-1 text-sm text-gold-deep">{o.insight}</p>}
                      <MemberForm action={forgetScenario} className="mt-2"><input type="hidden" name="content_id" value={s.id} /><button className="text-xs text-muted underline">Revisit this question</button></MemberForm>
                    </li>
                  );
                })}
              </ul>
            </LuxSection>
          )}
        </div>
        <aside className="space-y-5 lg:pt-10">
          <ReadinessCard r={state.readiness} />
          <MemberForm action={saveSanctuarySettings} className="glass p-6">
            <input type="hidden" name="section" value="consent" />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="share_with_portfolio" defaultChecked={state.settings.share_with_portfolio} className="mt-1 h-4 w-4 accent-[var(--champagne)]" />
              <span>Use my Sanctuary answers and Who Am I? progress in my private Discovery Portfolio and to personalize my suggestions. My answers are never shown to other members.</span>
            </label>
            <button className="btn btn-ghost btn-sm mt-3">Save</button>
          </MemberForm>
          <MemberForm action={saveSanctuarySettings} className="glass p-6">
            <input type="hidden" name="section" value="interests" />
            <p className="text-sm font-semibold">What would you like to explore?</p>
            <p className="mt-1 text-xs text-muted">Choose up to 12. Used only for your own suggestions.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERESTS.map(([k, l]) => (
                <label key={k} className="cursor-pointer"><input type="checkbox" name="interests" value={k} defaultChecked={state.settings.explore_interests.includes(k)} className="peer sr-only" />
                  <span className="block rounded-full border border-line-strong px-3 py-1 text-xs text-muted peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-gold">{l}</span></label>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm mt-3">Save my interests</button>
          </MemberForm>
          <p className="text-sm"><Link href="/app/discover" className="text-gold underline">See what&rsquo;s possible for you →</Link></p>
        </aside>
      </div>
      <Notice>Your discovery answers are confidential. They are guidance for your own reflection, never definitive judgments or predictions of behavior.</Notice>
    </>
  );
}
