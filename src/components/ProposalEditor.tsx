"use client";
import { useState, useTransition } from "react";
import { saveProposalDraft } from "@/app/actions/proposals";
import { BASIS, SECTIONS, completeness, type Basis, type Sections } from "@/lib/proposals";

/** Guided proposal editor: each section states its basis (fact, research, assumption, estimate, proposed arrangement). */
export function ProposalEditor({ id, title: t0, sections: s0, editingAuthorized }: { id: string; title: string; sections: Sections; editingAuthorized: boolean }) {
  const [title, setTitle] = useState(t0);
  const [sections, setSections] = useState<Sections>(s0);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const c = completeness(sections);
  const set = (k: string, patch: Partial<{ text: string; basis: Basis }>) => {
    const def = SECTIONS.find((x) => x.key === k)!.defaultBasis;
    setSections((s) => ({ ...s, [k]: { text: patch.text ?? s[k]?.text ?? "", basis: patch.basis ?? s[k]?.basis ?? def } }));
    setDirty(true);
  };
  const save = () => start(async () => { const r = await saveProposalDraft(id, title, sections, note); setMsg(r.message); if (r.ok) { setDirty(false); setNote(""); } });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div className="glass sticky top-20 z-10 flex flex-wrap items-center gap-3 p-4">
          <input className="field min-w-0 flex-1 font-semibold" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Proposal title" />
          <button className="btn btn-gold btn-sm" onClick={save} disabled={pending || !dirty}>{pending ? "Saving…" : dirty ? (editingAuthorized ? "Save as new draft" : "Save draft") : "Saved"}</button>
          {msg && <span className="text-xs text-muted" role="status">{msg}</span>}
        </div>
        {editingAuthorized && <p className="text-xs text-muted">The latest version is authorized and preserved. Saving creates a new draft version for your review.</p>}
        {SECTIONS.map((s) => (
          <section key={s.key} className="glass p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="display text-xl">{s.title}{s.core && <span className="ml-2 align-middle text-xs text-gold">core</span>}</h2>
              <select className="field w-auto !py-1 text-xs" value={sections[s.key]?.basis ?? s.defaultBasis} onChange={(e) => set(s.key, { basis: e.target.value as Basis })} aria-label={`${s.title} basis`}>
                {Object.entries(BASIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <p className="mt-1 text-xs text-muted">{s.prompt}</p>
            <textarea className="field mt-3 w-full" rows={s.core ? 4 : 3} maxLength={6000} value={sections[s.key]?.text ?? ""} onChange={(e) => set(s.key, { text: e.target.value })} />
          </section>
        ))}
        <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">What changed in this version (optional)</span><input className="field w-full" value={note} onChange={(e) => { setNote(e.target.value); setDirty(true); }} /></label>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="glass p-5 text-sm">
          <p className="eyebrow">Completeness review</p>
          <p className="display mt-2 text-3xl text-gold">{c.done} of {c.total}</p>
          <p className="text-xs text-muted">core sections complete</p>
          {c.missing.length > 0 && <><p className="mt-3 font-semibold">Still needed</p><ul className="mt-1 list-disc pl-5 text-muted">{c.missing.map((m) => <li key={m}>{m}</li>)}</ul></>}
          {c.estimates.length > 0 && <><p className="mt-3 font-semibold">Labeled as estimates or assumptions</p><ul className="mt-1 list-disc pl-5 text-muted">{c.estimates.map((m) => <li key={m}>{m}</li>)}</ul></>}
          {c.flags.length > 0 && <><p className="mt-3 font-semibold">For professional review</p><ul className="mt-1 list-disc pl-5 text-muted">{c.flags.map((m) => <li key={m}>{m}</li>)}</ul></>}
          <p className="mt-3 text-xs text-faint">This checks administrative completeness only. It never judges legal or financial sufficiency.</p>
        </section>
      </aside>
    </div>
  );
}
