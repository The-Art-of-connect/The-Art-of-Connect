import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { FREQUENCIES, FREQUENCY_LABEL, MILESTONE_KINDS } from "@/lib/growth";
import { addMilestone, deleteMilestone, requestReflection, saveGrowthPrefs } from "@/app/actions/growth";
import { brandName } from "@/lib/brand";

/**
 * Lifelong growth inside My Personal Discovery Portfolio (directive 45 and amendment): the member's reflection frequency,
 * their chronological reflections and milestones. No separate dashboard is created.
 */
export async function GrowthPanel({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const db = await createClient();
  if (!db) return null;
  const [{ data: prefs }, { data: reports }, { data: milestones }] = await Promise.all([
    db.from("growth_prefs").select("frequency, paused, next_due_at").eq("user_id", userId).maybeSingle(),
    db.from("growth_reports").select("id, kind, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(24),
    db.from("milestones").select("id, kind, title, occurred_on, visibility, source, recurring").eq("user_id", userId).order("occurred_on", { ascending: false }).limit(50),
  ]);
  const choose = (
    <MemberForm action={saveGrowthPrefs} className="space-y-3">
      <fieldset className="space-y-2"><legend className="sr-only">How often</legend>
        {FREQUENCIES.map((f) => (
          <label key={f.key} className="flex cursor-pointer items-start gap-3 rounded-2xl p-2 hover:bg-gold/5">
            <input type="radio" name="frequency" value={f.key} defaultChecked={(prefs?.frequency ?? "quarterly") === f.key} className="mt-1.5 h-5 w-5" />
            <span><span className="block text-lg font-semibold">{f.label}</span><span className="block text-sm text-muted">{f.line}</span></span>
          </label>
        ))}
      </fieldset>
      {prefs && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paused" defaultChecked={prefs.paused} /> Pause my reflections for now</label>}
      <button className="btn btn-gold btn-sm">{prefs ? "Save" : "Choose"}</button>
      <p className="text-xs text-muted">You can change your preference at any time. Journey keeps your history and milestones whatever you choose.</p>
    </MemberForm>
  );
  if (compact) return prefs ? null : (
    <section className="glass mb-8 p-6"><p className="eyebrow">{brandName("brand")}</p><h2 className="display mt-2 text-3xl">Celebrate Your Becoming</h2>
      <p className="mt-2 text-muted">How often would you like Journey to prepare a personalized reflection on your growth, accomplishments and important milestones?</p><div className="mt-4">{choose}</div></section>
  );
  return (
    <section id="growth" className="mt-10 space-y-6">
      <div className="glass p-6">
        <p className="eyebrow">{brandName("brand")}</p><h2 className="display mt-2 text-3xl">Celebrate Your Becoming</h2>
        <p className="mt-2 text-muted">{prefs ? <>Your reflections: <span className="font-semibold text-text">{FREQUENCY_LABEL[prefs.frequency]}</span>{prefs.paused ? " (paused)" : prefs.next_due_at ? `, next on ${new Date(prefs.next_due_at).toLocaleDateString("en-US", { dateStyle: "long" })}` : ""}.</> : "How often would you like Journey to prepare a personalized reflection on your growth, accomplishments and important milestones?"}</p>
        <details className="mt-3" open={!prefs}><summary className="cursor-pointer text-sm text-gold-deep">{prefs ? "Change, pause or resume" : "Choose"}</summary><div className="mt-3">{choose}</div></details>
      </div>
      <div className="glass p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="display text-2xl">My reflections</h2><MemberForm action={requestReflection}><button className="btn btn-ghost btn-sm">Request one now</button></MemberForm></div>
        {(reports ?? []).length === 0 ? <p className="mt-2 text-sm text-muted">Your first reflection will compare where you began with where you are now.</p> : (
          <ul className="mt-3 divide-y divide-line">{(reports ?? []).map((r) => <li key={r.id}><Link href={`/app/know-yourself/portfolio/reports/${r.id}`} className="flex justify-between gap-3 py-3 text-sm"><span>{new Date(r.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}</span><span className="text-muted">{r.kind === "on_demand" ? "Requested" : "Scheduled"} ›</span></Link></li>)}</ul>
        )}
      </div>
      <div id="milestones" className="glass p-6">
        <h2 className="display text-2xl">Milestones</h2>
        <p className="mt-1 text-sm text-muted">Moments worth remembering. Private unless you choose to share one with your partner.</p>
        {(milestones ?? []).length > 0 && <ul className="mt-3 divide-y divide-line">{(milestones ?? []).map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <span><span className="font-semibold">{m.title}</span><span className="block text-xs text-muted">{MILESTONE_KINDS[m.kind]} · {new Date(m.occurred_on).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}{m.recurring ? " · every year" : ""} · {m.visibility === "shared_partner" ? "shared with your partner" : "private"}</span></span>
            {m.source === "member" && <MemberForm action={deleteMilestone}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-muted underline">Remove</button></MemberForm>}
          </li>
        ))}</ul>}
        <MemberForm action={addMilestone} className="mt-4 grid gap-2 sm:grid-cols-2">
          <select name="kind" required defaultValue="" className="field" aria-label="Kind"><option value="" disabled>What kind of milestone?</option>{Object.entries(MILESTONE_KINDS).filter(([k]) => k !== "membership_anniversary").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="title" required maxLength={160} className="field" placeholder="Name it" aria-label="Milestone" />
          <input name="on" type="date" className="field" aria-label="Date" />
          <span className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="recurring" /> Every year</label><label className="flex items-center gap-2"><input type="checkbox" name="shared" /> Share with my partner</label></span>
          <button className="btn btn-gold btn-sm sm:w-fit">Add milestone</button>
        </MemberForm>
      </div>
    </section>
  );
}
