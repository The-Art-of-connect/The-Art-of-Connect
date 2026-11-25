import { isInsidePreview, requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeleteEntry, JournalForm } from "@/components/JournalForm";
import { LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "My private journal" };

export default async function Journal() {
  const { viewer } = await requireExperience("counseling");
  const supabase = await createClient();
  const { data } = supabase && !isInsidePreview(viewer)
    ? await supabase.schema("counseling").from("journal_entries").select("id, title, body, mood, created_at").order("created_at", { ascending: false }).limit(100)
    : { data: [] };
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">The Art of Becoming · In Life</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">My private journal</h1>
      <p className="mt-3 text-muted">Reflect on your experiences and recognize your progress.</p>
      <div className="mt-8"><Notice>Visible only to you — not to partners, matches, Journey or The Art of Connect team.</Notice></div>
      <div className="mt-8"><JournalForm /></div>
      <LuxSection title="Your entries">
        {data && data.length ? (
          <ul className="space-y-4">
            {data.map((e) => (
              <li key={e.id} className="glass p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{new Date(e.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}{e.mood ? ` · ${e.mood}` : ""}</p>
                  <DeleteEntry id={e.id} />
                </div>
                {e.title && <p className="display mt-2 text-2xl">{e.title}</p>}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{e.body}</p>
              </li>
            ))}
          </ul>
        ) : <p className="glass p-6 text-sm text-muted">Your first entry will appear here.</p>}
      </LuxSection>
      <SafetyFooter />
    </div>
  );
}
