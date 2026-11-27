"use client";
import { useState, useTransition } from "react";
import { saveResume } from "@/app/actions/resume";
import {
  ACTION_VERBS, GUIDANCE, RESUME_TEMPLATES, dateRange, resumeChecklist, sectionOrder, sectionTitle,
  type Certification, type Education, type Experience, type LetterData, type ResumeData,
} from "@/lib/resume";

/**
 * The Résumé Builder editor: guided sections on the left, a live preview in the chosen template on the right.
 * Guidance is educational only; nothing is written for the member.
 */
type Props = { id: string; kind: "resume" | "letter"; title: string; template: string; data: ResumeData | LetterData; locked?: boolean };

const input = "field w-full";
const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";

function Field({ name, value, onChange, placeholder, area, rows = 3 }: { name: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; rows?: number }) {
  return (
    <label className="block">
      <span className={label}>{name}</span>
      {area
        ? <textarea className={`${input} min-h-[5rem]`} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input className={input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function Guide({ k }: { k: string }) {
  const g = GUIDANCE[k];
  if (!g) return null;
  return (
    <details className="mt-3 rounded-xl border border-line bg-[var(--hover-bg)] px-4 py-3 text-sm">
      <summary className="cursor-pointer text-gold">✦ {g.title}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      {g.pattern && <p className="mt-2 text-muted"><span className="font-semibold text-text">A pattern to adapt with your own facts: </span>{g.pattern}</p>}
    </details>
  );
}

function Card({ title, children, guide }: { title: string; children: React.ReactNode; guide?: string }) {
  return (
    <section className="glass p-5 sm:p-6">
      <h2 className="display text-xl">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
      {guide && <Guide k={guide} />}
    </section>
  );
}

export function ResumeEditor(p: Props) {
  const [title, setTitle] = useState(p.title);
  const [template, setTemplate] = useState(p.template);
  const [data, setData] = useState(p.data);
  const [status, setStatus] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const r = data as ResumeData; const l = data as LetterData;

  const update = (patch: Partial<ResumeData & LetterData>) => { setData((d) => ({ ...d, ...patch })); setDirty(true); };
  const contact = (k: keyof ResumeData["contact"], v: string) => update({ contact: { ...r.contact, [k]: v } });
  const save = () => start(async () => {
    const res = await saveResume(p.id, title, template, data);
    setStatus(res.ok ? `Saved ${new Date(res.savedAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : res.message);
    if (res.ok) setDirty(false);
  });

  const setList = <T,>(key: "experience" | "education" | "certifications", list: T[]) => update({ [key]: list } as Partial<ResumeData>);
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="glass sticky top-20 z-10 flex flex-wrap items-center gap-3 p-4">
          <input className="field min-w-0 flex-1 font-semibold" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Title" />
          {p.kind === "resume" && (
            <select className="field w-auto" value={template} onChange={(e) => { setTemplate(e.target.value); setDirty(true); }} aria-label="Template">
              {RESUME_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          )}
          <button className="btn btn-gold btn-sm" onClick={save} disabled={pending || p.locked}>{pending ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
          {status && <span className="text-xs text-muted" role="status">{status}</span>}
        </div>

        <Card title="Your details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="Full name" value={r.contact.name} onChange={(v) => contact("name", v)} />
            <Field name="Professional headline" value={r.contact.headline} onChange={(v) => contact("headline", v)} placeholder="e.g. Operations Director" />
            <Field name="Email" value={r.contact.email} onChange={(v) => contact("email", v)} />
            <Field name="Phone" value={r.contact.phone} onChange={(v) => contact("phone", v)} />
            <Field name="City and state" value={r.contact.location} onChange={(v) => contact("location", v)} />
            <Field name="Website or LinkedIn (one per line)" area rows={2} value={r.contact.links.join("\n")} onChange={(v) => update({ contact: { ...r.contact, links: lines(v).slice(0, 4) } })} />
          </div>
          <p className="text-xs text-faint">Your contact details stay private to you and appear only on documents you download.</p>
        </Card>

        {p.kind === "letter" ? (
          <Card title="Your letter" guide="letter">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="Date" value={l.date} onChange={(v) => update({ date: v })} placeholder="November 27, 2026" />
              <Field name="Role" value={l.role} onChange={(v) => update({ role: v })} />
              <Field name="Recipient name" value={l.recipientName} onChange={(v) => update({ recipientName: v })} />
              <Field name="Recipient title" value={l.recipientTitle} onChange={(v) => update({ recipientTitle: v })} />
              <Field name="Company" value={l.company} onChange={(v) => update({ company: v })} />
              <Field name="Sign-off" value={l.signOff} onChange={(v) => update({ signOff: v })} />
            </div>
            <Field name="Opening" area value={l.opening} onChange={(v) => update({ opening: v })} />
            <Field name="Body (leave a blank line between paragraphs)" area rows={8} value={l.body} onChange={(v) => update({ body: v })} />
            <Field name="Closing" area value={l.closing} onChange={(v) => update({ closing: v })} />
          </Card>
        ) : (
          <>
            <Card title="Summary" guide="summary">
              <Field name="Professional summary" area rows={4} value={r.summary} onChange={(v) => update({ summary: v })} />
            </Card>

            <Card title="Experience" guide="experience">
              {r.experience.map((e, i) => {
                const set = (patch: Partial<Experience>) => setList("experience", r.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="rounded-2xl border border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field name="Title" value={e.title} onChange={(v) => set({ title: v })} />
                      <Field name="Organization" value={e.organization} onChange={(v) => set({ organization: v })} />
                      <Field name="Location" value={e.location} onChange={(v) => set({ location: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field name="Start" value={e.start} onChange={(v) => set({ start: v })} placeholder="Mar 2021" />
                        <Field name="End" value={e.current ? "" : e.end} onChange={(v) => set({ end: v })} placeholder={e.current ? "Present" : "Jun 2024"} />
                      </div>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={e.current} onChange={(x) => set({ current: x.target.checked })} />I work here now</label>
                    <div className="mt-3"><Field name="Highlights (one per line)" area rows={4} value={e.highlights.join("\n")} onChange={(v) => set({ highlights: v.split("\n").slice(0, 8) })} /></div>
                    <div className="mt-2 flex gap-4 text-xs">
                      {i > 0 && <button type="button" className="text-muted underline" onClick={() => { const a = [...r.experience]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setList("experience", a); }}>Move up</button>}
                      <button type="button" className="text-muted underline" onClick={() => setList("experience", r.experience.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  </div>
                );
              })}
              {r.experience.length < 15 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList("experience", [...r.experience, { title: "", organization: "", location: "", start: "", end: "", current: false, highlights: [] }])}>+ Add a position</button>}
              <details className="text-sm"><summary className="cursor-pointer text-gold">✦ Action verbs to start your highlights</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">{ACTION_VERBS.map(([g, v]) => <p key={g} className="text-muted"><span className="font-semibold text-text">{g}: </span>{v.join(", ")}</p>)}</div>
              </details>
            </Card>

            <Card title="Education" guide="education">
              {r.education.map((e, i) => {
                const set = (patch: Partial<Education>) => setList("education", r.education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2">
                    <Field name="School or program" value={e.school} onChange={(v) => set({ school: v })} />
                    <Field name="Degree or certificate" value={e.credential} onChange={(v) => set({ credential: v })} />
                    <Field name="Field of study" value={e.field} onChange={(v) => set({ field: v })} />
                    <Field name="Year (or expected year)" value={e.year} onChange={(v) => set({ year: v })} />
                    <Field name="Honors (optional)" value={e.honors} onChange={(v) => set({ honors: v })} />
                    <button type="button" className="self-end text-left text-xs text-muted underline" onClick={() => setList("education", r.education.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                );
              })}
              {r.education.length < 8 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList("education", [...r.education, { school: "", credential: "", field: "", year: "", honors: "" }])}>+ Add education</button>}
            </Card>

            <Card title="Certifications & licenses" guide="certifications">
              {r.certifications.map((c, i) => {
                const set = (patch: Partial<Certification>) => setList("certifications", r.certifications.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2">
                    <Field name="Official name" value={c.name} onChange={(v) => set({ name: v })} />
                    <Field name="Issuing organization" value={c.issuer} onChange={(v) => set({ issuer: v })} />
                    <Field name="Year" value={c.year} onChange={(v) => set({ year: v })} />
                    <Field name="Credential number (optional)" value={c.credentialId} onChange={(v) => set({ credentialId: v })} />
                    <button type="button" className="text-left text-xs text-muted underline" onClick={() => setList("certifications", r.certifications.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                );
              })}
              {r.certifications.length < 12 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList("certifications", [...r.certifications, { name: "", issuer: "", year: "", credentialId: "" }])}>+ Add a credential</button>}
            </Card>

            <Card title="Skills" guide="skills">
              <Field name="Skills (separate with commas)" area rows={2} value={r.skills.join(", ")} onChange={(v) => update({ skills: v.split(",").map((s) => s.trimStart()).slice(0, 40) })} />
            </Card>
            <Card title="Accomplishments" guide="accomplishments">
              <Field name="One per line" area rows={4} value={r.accomplishments.join("\n")} onChange={(v) => update({ accomplishments: v.split("\n").slice(0, 10) })} />
            </Card>
          </>
        )}
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <Preview kind={p.kind} template={template} data={data} />
        {p.kind === "resume" && (
          <div className="glass mt-4 p-5">
            <p className="eyebrow">Ready check</p>
            <ul className="mt-2 space-y-1.5 text-sm">{resumeChecklist(r).map((c) => <li key={c.label} className="flex gap-2"><span className={c.done ? "text-success" : "text-faint"}>{c.done ? "✓" : "○"}</span>{c.label}</li>)}</ul>
            <p className="mt-2 text-xs text-faint">A formatting checklist only. It never judges your qualifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** The live, print-quality preview (fonts and layout mirror the PDF and Word downloads). */
export function Preview({ kind, template, data }: { kind: "resume" | "letter"; template: string; data: ResumeData | LetterData }) {
  const c = data.contact;
  const head = (
    <header className="border-b-2 border-[#A88A5C] pb-3">
      <p className="font-serif text-[1.7rem] font-bold leading-tight text-[#211f1c]">{c.name || "Your Name"}</p>
      {c.headline && <p className="font-serif text-base text-[#5e5a54]">{c.headline}</p>}
      <p className="mt-1 text-[0.72rem] text-[#5e5a54]">{[c.location, c.email, c.phone, ...c.links].filter(Boolean).join("  ·  ")}</p>
    </header>
  );
  const H = ({ t }: { t: string }) => <h3 className="mt-4 border-b border-[#A88A5C]/60 pb-0.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#A88A5C]">{t}</h3>;
  if (kind === "letter") {
    const l = data as LetterData;
    return (
      <article className="rounded-2xl bg-[#fdfbf7] p-8 text-[0.82rem] leading-relaxed text-[#211f1c] shadow-xl ring-1 ring-black/5">
        {head}
        <div className="mt-5 space-y-3">
          {l.date && <p>{l.date}</p>}
          <p>{[l.recipientName, l.recipientTitle, l.company].filter(Boolean).map((x) => <span key={x} className="block">{x}</span>)}</p>
          {l.role && <p className="font-serif font-bold">Re: {l.role}</p>}
          <p>Dear {l.recipientName || "Hiring Manager"},</p>
          {[l.opening, ...l.body.split(/\n{2,}/), l.closing].filter(Boolean).map((x, i) => <p key={i} className="whitespace-pre-line">{x}</p>)}
          <p>{l.signOff || "Sincerely,"}</p>
          <p className="font-serif text-base font-bold">{c.name}</p>
        </div>
      </article>
    );
  }
  const r = data as ResumeData;
  return (
    <article className="rounded-2xl bg-[#fdfbf7] p-8 text-[0.8rem] leading-relaxed text-[#211f1c] shadow-xl ring-1 ring-black/5" aria-label="Résumé preview">
      {head}
      {sectionOrder(template).map((s) => {
        if (s === "summary" && r.summary) return <div key={s}><H t={sectionTitle(s, template)} /><p className="mt-1.5">{r.summary}</p></div>;
        if (s === "experience" && r.experience.length) return (
          <div key={s}><H t={sectionTitle(s, template)} />
            {r.experience.map((e, i) => (
              <div key={i} className="mt-2.5">
                <p className="flex justify-between gap-3"><span className="font-serif text-[0.92rem] font-bold">{e.title || "Role"}</span><span className="shrink-0 text-[0.7rem] text-[#5e5a54]">{dateRange(e)}</span></p>
                <p className="font-serif italic text-[#5e5a54]">{[e.organization, e.location].filter(Boolean).join(", ")}</p>
                <ul className="mt-1 list-disc pl-5 marker:text-[#A88A5C]">{e.highlights.filter(Boolean).map((h, j) => <li key={j}>{h}</li>)}</ul>
              </div>
            ))}
          </div>
        );
        if (s === "education" && r.education.length) return (
          <div key={s}><H t={sectionTitle(s, template)} />{r.education.map((e, i) => <div key={i} className="mt-1.5"><p className="font-serif font-bold">{[e.credential, e.field].filter(Boolean).join(", ") || e.school}</p><p className="text-[0.72rem] text-[#5e5a54]">{[e.school, e.year, e.honors].filter(Boolean).join("  ·  ")}</p></div>)}</div>
        );
        if (s === "certifications" && r.certifications.length) return (
          <div key={s}><H t={sectionTitle(s, template)} /><ul className="mt-1 list-disc pl-5 marker:text-[#A88A5C]">{r.certifications.map((x, i) => <li key={i}>{[x.name, x.issuer, x.year, x.credentialId && `Credential ${x.credentialId}`].filter(Boolean).join(" · ")}</li>)}</ul></div>
        );
        if (s === "skills" && r.skills.filter(Boolean).length) return <div key={s}><H t={sectionTitle(s, template)} /><p className="mt-1.5">{r.skills.filter(Boolean).join("  ·  ")}</p></div>;
        if (s === "accomplishments" && r.accomplishments.filter(Boolean).length) return <div key={s}><H t={sectionTitle(s, template)} /><ul className="mt-1 list-disc pl-5 marker:text-[#A88A5C]">{r.accomplishments.filter(Boolean).map((a, i) => <li key={i}>{a}</li>)}</ul></div>;
        return null;
      })}
    </article>
  );
}
