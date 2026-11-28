import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { COUPLES_TABS, MOODS, questionFor } from "@/lib/in-love";
import { saveCheckin } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check-in · In Love" };

/** Daily relationship check-in (directive 38): private by default; each partner chooses what to share. */
export default async function Checkin() {
  const { viewer } = await requireExperience("relationships");
  const db = isInsidePreview(viewer) ? null : await createClient();
  const rel = db?.schema("relationships");
  const day = new Date().toISOString().slice(0, 10);
  const { data: rows } = rel ? await rel.from("couple_checkins").select("user_id, mood, note, shared").eq("day", day) : { data: [] };
  const mine = (rows ?? []).find((r) => r.user_id === viewer.id);
  const theirs = (rows ?? []).find((r) => r.user_id !== viewer.id);
  const q = questionFor();
  return (
    <>
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">Today&rsquo;s connection</p><h1 className="display mt-3 text-3xl leading-snug sm:text-4xl">{q.q}</h1><p className="mt-2 text-muted">{q.hint}</p>
        <InLoveTabs tabs={COUPLES_TABS} />
      </section>
      <MemberForm action={saveCheckin} className="glass mt-6 max-w-2xl space-y-4 p-6">
        <fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">How are you feeling about us today?</legend>
          <div className="flex flex-wrap gap-2">{Object.entries(MOODS).map(([k, v]) => (
            <label key={k} className="nav-pill cursor-pointer text-sm has-[:checked]:!border-gold has-[:checked]:!bg-gold/15"><input type="radio" name="mood" value={k} defaultChecked={mine?.mood === k} className="sr-only" />{v}</label>
          ))}</div>
        </fieldset>
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your answer or a note (optional)</span><textarea name="note" rows={4} maxLength={1000} defaultValue={mine?.note ?? ""} className="field w-full" /></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="shared" defaultChecked={mine?.shared ?? false} className="mt-1" /><span><span className="font-semibold">Share with my partner</span><span className="block text-muted">Unchecked, this stays private to you.</span></span></label>
        <button className="btn btn-gold">Save today&rsquo;s check-in</button>
      </MemberForm>
      <section className="glass mt-6 max-w-2xl p-6">
        <p className="eyebrow">From your partner today</p>
        {theirs ? <><p className="mt-2 font-semibold">{MOODS[theirs.mood] ?? theirs.mood}</p>{theirs.note && <p className="mt-1 whitespace-pre-line text-sm">{theirs.note}</p>}</> : <p className="mt-2 text-sm text-muted">Nothing shared yet today. What your partner keeps private stays private.</p>}
      </section>
    </>
  );
}
