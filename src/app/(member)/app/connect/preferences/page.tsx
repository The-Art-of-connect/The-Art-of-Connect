import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { clearConnectionPreferences, saveConnectionPreferences } from "@/app/actions/social";
import { SECTIONS, type Answers } from "@/lib/connection-intelligence";
import { EliteBadge } from "@/components/EliteBadge";

export const metadata = { title: "My connection preferences" };
const ELITE_ONLY = [["business", "Business networking"], ["peers", "Meeting peers"], ["friendship", "Friendships"], ["social", "Social activities"], ["travel", "Travel companionship"], ["couples_friendship", "Couples friendships"]] as const;

/** Progressive, private connection assessment. Viewable, correctable and deletable at any time. */
export default async function ConnectionPreferences({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const viewer = (await getViewer())!;
  const wanted = (await searchParams).section;
  if (isInsidePreview(viewer) || viewer.viewAs) return <p className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">Preview: sign in with your own account.</p>;
  const db = (await createClient())!;
  const [{ data: pref }, { data: badge }] = await Promise.all([
    db.from("social_preferences").select("answers, elite_only").eq("user_id", viewer.id).maybeSingle(),
    db.from("elite_badges").select("status").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const a = (pref?.answers ?? {}) as Answers;
  const done = (id: string) => SECTIONS.find((s) => s.id === id)!.questions.every((q) => (Array.isArray(a[q.id]) ? (a[q.id] as string[]).length : a[q.id]));
  const active = SECTIONS.find((s) => s.id === wanted) ?? SECTIONS.find((s) => !done(s.id)) ?? SECTIONS[0];
  const elite = badge?.status === "active";
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Connection Intelligence</p>
        <h1 className="display mt-2 text-4xl">My connection preferences</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Private to you. Each section is used only for the kind of connection it describes, so business fit, friendship fit and travel fit stay separate. Recommendations are suggestions, never assignments, and they never consider income, Elite status or membership level.</p>
      </header>
      <nav className="flex flex-wrap gap-2">{SECTIONS.map((s) => (
        <Link key={s.id} href={`/app/connect/preferences?section=${s.id}`} className={`rounded-full border px-3 py-1.5 text-sm ${s.id === active.id ? "border-gold bg-gold/10 font-semibold" : "border-line"}`}>{done(s.id) ? "✓ " : ""}{s.title}</Link>
      ))}</nav>
      <ActionForm action={saveConnectionPreferences} className="glass space-y-5 p-6">
        <input type="hidden" name="section" value={active.id} />
        <div><h2 className="display text-2xl">{active.title}</h2><p className="text-xs text-muted">{active.why}</p></div>
        {active.questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="text-sm font-semibold">{q.label}</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{q.options.map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type={q.multi ? "checkbox" : "radio"} name={q.id} value={k} defaultChecked={Array.isArray(a[q.id]) ? (a[q.id] as string[]).includes(k) : a[q.id] === k} /> {v}
              </label>
            ))}</div>
          </fieldset>
        ))}
        <button className="btn btn-gold btn-sm">Save this section</button>
      </ActionForm>

      {elite && (
        <ActionForm action={saveConnectionPreferences} className="glass space-y-3 p-6">
          <input type="hidden" name="elite_only_form" value="1" />
          <h2 className="display flex items-center gap-2 text-2xl"><EliteBadge size={22} interactive={false} /> Elite-only connections</h2>
          <p className="text-sm text-muted">Choose activities you&rsquo;d prefer to keep among verified Elite members. Everything else stays open to the broader community, where you&rsquo;re always welcome to participate, mentor and share.</p>
          <div className="grid gap-2 sm:grid-cols-2">{ELITE_ONLY.map(([k, v]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="elite_only" value={k} defaultChecked={(pref?.elite_only as string[] | undefined)?.includes(k)} /> {v}</label>)}</div>
          <button className="btn btn-gold btn-sm">Save</button>
        </ActionForm>
      )}

      <ActionForm action={clearConnectionPreferences} className="text-right"><button className="text-xs text-faint underline hover:text-danger">Delete all my connection preferences</button></ActionForm>
    </div>
  );
}
