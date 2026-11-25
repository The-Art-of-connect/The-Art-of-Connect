import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { addMemory, deleteMemory, setMemoryEnabled } from "@/app/actions/journey-member";

export const metadata = { title: "What Journey remembers" };

const KINDS: [string, string][] = [
  ["goal", "Goals and aspirations"], ["preference", "Preferences"], ["milestone", "Milestones"], ["progress", "Personal development progress"], ["highlight", "Conversation highlights"],
];

export default async function Memory() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const live = supabase && !isInsidePreview(viewer);
  const [{ data: settings }, { data: memories }] = live
    ? await Promise.all([
        supabase.from("journey_memory_settings").select("enabled").eq("user_id", viewer.id).maybeSingle(),
        supabase.from("journey_memories").select("id, kind, content, created_at").order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: [] }];
  const on = Boolean(settings?.enabled);
  return (
    <>
      <LuxHero eyebrow="Journey" title="What Journey remembers" tagline="Continuity, with your permission.">
        <p className="max-w-2xl text-muted">Journey can remember what you choose, so each conversation builds on the last. You decide what is kept, and you can review, change or delete it at any time.</p>
      </LuxHero>
      <LuxSection title="Your memory settings">
        <div className="glass flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <span><span className="block font-semibold">Personal memory</span><span className="block text-sm text-muted">{on ? "On — Journey uses what you've saved below." : "Off — Journey doesn't use anything you've saved."}</span></span>
          <MemberForm action={setMemoryEnabled}>
            <input type="hidden" name="on" value={String(!on)} />
            <button className={`btn ${on ? "btn-ghost" : "btn-gold"}`}>{on ? "Turn memory off" : "Turn memory on"}</button>
          </MemberForm>
        </div>
        <MemberForm action={addMemory} className="glass mt-5 grid gap-3 p-6 sm:grid-cols-[12rem_1fr_auto] sm:items-start">
          <select name="kind" className="field" aria-label="Kind">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input name="content" maxLength={600} required className="field" placeholder="e.g. I'm working on speaking up kindly at work" />
          <button className="btn btn-gold">Remember this</button>
        </MemberForm>
      </LuxSection>
      <LuxSection title="Everything Journey remembers for you">
        {memories && memories.length ? (
          <ul className="glass divide-y divide-line">
            {memories.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <span><span className="block text-xs tracking-[0.2em] text-gold-deep uppercase">{KINDS.find((k) => k[0] === m.kind)?.[1]}</span><span className="mt-1 block">{m.content}</span></span>
                <MemberForm action={deleteMemory}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-gold-deep underline">Delete</button></MemberForm>
              </li>
            ))}
          </ul>
        ) : <p className="glass p-6 text-sm text-muted">Nothing saved yet.</p>}
        {memories && memories.length > 0 && (
          <MemberForm action={deleteMemory} className="mt-4"><input type="hidden" name="all" value="1" /><button className="btn btn-ghost">Delete everything Journey remembers</button></MemberForm>
        )}
      </LuxSection>
      <div className="mt-10"><Notice>Journey never shares what it remembers with another member — not even your partner — and never uses anyone else&rsquo;s private information to advise you. Our team can&rsquo;t read your memories.</Notice></div>
      <SafetyFooter />
    </>
  );
}
