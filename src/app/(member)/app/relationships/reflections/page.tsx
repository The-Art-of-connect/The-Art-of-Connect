import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "@/components/MemberForm";
import { InLoveTabs } from "@/components/love/InLoveTabs";
import { COUPLES_TABS, REFLECTION_PROMPTS, SINGLES_TABS, reflectionView } from "@/lib/in-love";
import { brandName } from "@/lib/brand";
import { deleteReflection, saveReflection, shareReflection } from "@/app/actions/in-love";

export const dynamic = "force-dynamic";
export const metadata = { title: "Private Reflections · In Love" };

type Row = { id: string; user_id: string; prompt: string | null; body: string; created_at: string; updated_at: string | null; shared_at: string | null };
const when = (d: string) => new Date(d).toLocaleDateString("en-US", { dateStyle: "long" });

/**
 * Private Reflections (directive 51 §7; directives 45 and 47). Each partner writes for themselves. Nothing is visible to the
 * other partner unless the author shares an individual reflection, and the database ends every share when a couple ends.
 */
export default async function Reflections() {
  const { viewer, preview } = await requireExperience("relationships");
  const db = isInsidePreview(viewer) || viewer.viewAs ? null : await createClient();
  const rel = db?.schema("relationships");
  const [{ data: rows }, { data: cm }] = rel
    ? await Promise.all([
        rel.from("private_reflections").select("id, user_id, prompt, body, created_at, updated_at, shared_at").order("created_at", { ascending: false }).limit(200),
        rel.from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];
  const { count } = rel && cm ? await rel.from("couple_members").select("user_id", { count: "exact", head: true }).eq("couple_id", cm.couple_id) : { count: 0 };
  const canShare = (count ?? 0) > 1;
  // Couples see their Couples tabs; a member without a shared space still keeps their own reflections.
  const tabs = cm || viewer.society === "couples" || isInsidePreview(viewer) ? COUPLES_TABS : SINGLES_TABS;
  const all = (rows ?? []) as Row[];
  const mine = all.filter((r) => reflectionView(r, viewer.id) !== "from-partner");
  const fromPartner = all.filter((r) => reflectionView(r, viewer.id) === "from-partner");
  const suggestion = REFLECTION_PROMPTS[Math.floor(Date.now() / 86_400_000) % REFLECTION_PROMPTS.length];

  return (
    <>
      {preview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — In Love is not open to members yet. Nothing is saved.</p>}
      <section className="rounded-[2rem] border border-line bg-[var(--surface,#fffdf8)] px-5 pt-7 shadow-sm sm:px-9">
        <p className="eyebrow">Yours alone</p>
        <h1 className="display mt-3 text-3xl leading-snug sm:text-4xl">{brandName("private-reflections")}</h1>
        <p className="mt-2 max-w-2xl text-muted">A quiet place to think honestly about your relationship. Your partner never sees a reflection unless you choose to share that one, and you can make it private again at any time.</p>
        <InLoveTabs tabs={tabs} />
      </section>

      <MemberForm action={saveReflection} className="glass mt-6 max-w-2xl space-y-4 p-6">
        <p className="eyebrow">Write a reflection</p>
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">A gentle starting point (optional)</span>
          <select name="prompt" defaultValue="" className="field w-full">
            <option value="">I&rsquo;ll write freely</option>
            {REFLECTION_PROMPTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your reflection</span>
          <textarea name="body" rows={6} required minLength={2} maxLength={4000} placeholder={suggestion} className="field w-full" />
        </label>
        <p className="text-xs text-muted">Saved privately. Only you can read it unless you later choose to share it.</p>
        <button className="btn btn-gold w-full sm:w-auto">Save privately</button>
      </MemberForm>

      {fromPartner.length > 0 && (
        <section className="glass mt-6 max-w-2xl p-6">
          <p className="eyebrow">Shared with you by your partner</p>
          <ul className="mt-3 divide-y divide-line">{fromPartner.map((r) => (
            <li key={r.id} className="py-4">
              {r.prompt && <p className="text-sm font-semibold text-gold-deep">{r.prompt}</p>}
              <p className="mt-1 whitespace-pre-line">{r.body}</p>
              <p className="mt-2 text-xs text-muted">Shared {when(r.shared_at ?? r.created_at)}</p>
            </li>
          ))}</ul>
        </section>
      )}

      <section className="mt-8 max-w-2xl">
        <h2 className="display text-2xl sm:text-3xl">My reflections</h2>
        {!canShare && <p className="mt-2 text-sm text-muted">Sharing an individual reflection becomes available once your partner has joined your shared space. <Link href="/app/relationships" className="text-gold underline">Our Relationship</Link></p>}
        {mine.length === 0 ? (
          <p className="glass mt-4 p-6 text-sm text-muted">No reflections yet. Begin with a single sentence above; there is no right or wrong way to reflect.</p>
        ) : (
          <ul className="mt-4 space-y-4">{mine.map((r) => {
            const shared = reflectionView(r, viewer.id) === "mine-shared";
            return (
              <li key={r.id} className="glass p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted">{when(r.created_at)}{r.updated_at ? " · edited" : ""}</p>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${shared ? "border-gold bg-gold/10 text-gold-deep" : "border-line text-muted"}`}>{shared ? "Shared with your partner" : "Private"}</span>
                </div>
                {r.prompt && <p className="mt-2 text-sm font-semibold text-gold-deep">{r.prompt}</p>}
                <p className="mt-1 whitespace-pre-line">{r.body}</p>
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-gold-deep">Edit</summary>
                  <MemberForm action={saveReflection} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="block"><span className="sr-only">Edit your reflection</span><textarea name="body" rows={5} required minLength={2} maxLength={4000} defaultValue={r.body} className="field w-full" /></label>
                    <button className="btn btn-gold btn-sm">Save changes</button>
                  </MemberForm>
                </details>
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  {(shared || canShare) && (
                    <MemberForm action={shareReflection}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="share" value={shared ? "0" : "1"} />
                      <button className="btn btn-ghost btn-sm">{shared ? "Make private again" : "Share this one with my partner"}</button>
                    </MemberForm>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted">Delete</summary>
                    <MemberForm action={deleteReflection} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={r.id} />
                      <label className="flex items-center gap-2"><input type="checkbox" name="confirm" required /> I understand this can&rsquo;t be undone</label>
                      <button className="btn btn-ghost btn-sm">Delete reflection</button>
                    </MemberForm>
                  </details>
                </div>
              </li>
            );
          })}</ul>
        )}
      </section>

      <p className="mt-8 max-w-2xl text-xs text-muted">Your reflections stay with you for life, including if your relationship changes. If a couple ends, every shared reflection becomes private again automatically. Would you like support? Visit the <Link href="/app/wellness" className="underline">Counseling &amp; Wellness Center</Link>.</p>
    </>
  );
}
