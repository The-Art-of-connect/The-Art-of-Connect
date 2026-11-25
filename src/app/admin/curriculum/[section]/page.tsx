import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CURRICULA, mergeCurriculum } from "@/lib/curricula";
import { publishCurriculumVersion, saveCurriculumDraft } from "@/app/actions/curriculum";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Edit curriculum" };
export const dynamic = "force-dynamic";

const Field = ({ name, label, value, rows = 0, hint }: { name: string; label: string; value: string; rows?: number; hint?: string }) => (
  <label className="block space-y-1">
    <span className="text-sm font-semibold">{label}</span>
    {hint && <span className="block text-xs text-muted">{hint}</span>}
    {rows ? <textarea name={name} defaultValue={value} rows={rows} className="field" /> : <input name={name} defaultValue={value} className="field" />}
  </label>
);

export default async function EditCurriculum({ params }: { params: Promise<{ section: string }> }) {
  await requireStaff(rolesFor("/admin/curriculum"));
  const section = (await params).section;
  const base = CURRICULA[section];
  if (!base) notFound();
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Curriculum Studio" title={base.title} /><NotConnected /></>;
  const { data: versions } = await supabase.from("curriculum_versions").select("id, version, status, note, created_at, published_at, content").eq("section", section).order("version", { ascending: false }).limit(40);
  const latest = versions?.[0];
  const c = latest ? mergeCurriculum(base, latest.content) : base;
  const date = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");
  const para = (xs: string[]) => xs.join("\n\n");

  return (
    <>
      <Link href="/admin/curriculum" className="text-sm text-gold">← Curriculum Studio</Link>
      <PageHeader eyebrow="Curriculum Studio" title={base.title} />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">
        Editing {latest ? `from version ${latest.version} (${latest.status})` : "the founding version V1.0"}. Saving creates a new draft. Members keep seeing the published version until you publish.
        Separate paragraphs with a blank line. The structure (lessons, questions and answer choices) stays fixed so members&rsquo; saved answers remain valid.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Edit content">
          <ActionForm action={saveCurriculumDraft} className="space-y-6 p-5">
            <input type="hidden" name="section" value={section} />
            <Field name="title" label="Section title" value={c.title} />
            <Field name="tagline" label="Tagline" value={c.tagline} />
            <Field name="purpose" label="Purpose" value={para(c.purpose)} rows={6} />
            <Field name="philosophy" label="Founding philosophy" value={c.philosophy} rows={2} />
            <Field name="closing" label="Closing line" value={c.closing} rows={2} />
            <Field name="journeyInstructions" label="Journey's specialized teaching instructions" value={c.journeyInstructions} rows={9} hint="Journey follows these whenever a member learns this section interactively. One instruction per line." />

            {c.lessons.map((l, n) => (
              <details key={l.slug} className="rounded-2xl border border-line p-4">
                <summary className="cursor-pointer font-semibold">Lesson {n + 1}: {l.title}</summary>
                <div className="mt-4 space-y-4">
                  <Field name={`${l.slug}.title`} label="Lesson title" value={l.title} />
                  <Field name={`${l.slug}.focus`} label="Educational focus" value={para(l.focus)} rows={4} />
                  {l.principles && <Field name={`${l.slug}.principles`} label="Founding principles (one per line)" value={l.principles.join("\n")} rows={6} />}
                  <Field name={`${l.slug}.understanding`} label="Guided understanding" value={para(l.understanding)} rows={6} />
                  <Field name={`${l.slug}.examples`} label="Real-life examples" value={l.examples.map((e) => `${e.who}: ${e.text}`).join("\n\n")} rows={6} hint="One example per paragraph, written as “Who: example”." />
                  <Field name={`${l.slug}.reflection`} label="Optional reflection prompt" value={l.reflection} rows={2} />
                  <Field name={`${l.slug}.forward`} label="Moving forward suggestion (used in the analysis)" value={l.forward} rows={2} />
                  <Field name={`${l.slug}.journeyPrompt`} label="Opening message when a member explores this lesson with Journey" value={l.journeyPrompt} rows={2} />
                  {l.questions.map((q, qi) => (
                    <fieldset key={q.key} className="space-y-3 rounded-xl bg-champagne/10 p-4">
                      <legend className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Question {qi + 1}</legend>
                      <Field name={`${l.slug}.${q.key}.prompt`} label="Question" value={q.prompt} />
                      {q.choices.map((ch, ci) => (
                        <div key={ch.key} className="space-y-2 border-l-2 border-champagne pl-3">
                          <Field name={`${l.slug}.${q.key}.${ch.key}.label`} label={`Answer ${ci + 1}`} value={ch.label} />
                          <Field name={`${l.slug}.${q.key}.${ch.key}.guidance`} label="Guided explanation (shown when chosen)" value={ch.guidance} rows={3} />
                          <Field name={`${l.slug}.${q.key}.${ch.key}.reading`} label={`Analysis interpretation (${ch.reading.kind === "strength" ? "Personal Strengths" : "Areas for Personal Development"})`} value={ch.reading.text} rows={2} />
                        </div>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </details>
            ))}
            <Field name="note" label="Version note (optional)" value="" hint="For example: “Softened Lesson 2 wording.”" />
            <button className="btn btn-gold">Save as a new draft version</button>
          </ActionForm>
        </Panel>

        <Panel title="Versions">
          <div className="space-y-3 p-5">
            <p className="text-sm text-muted">{versions?.some((v) => v.status === "published") ? "" : "No version published yet. Members see the founding version V1.0."}</p>
            {(versions ?? []).map((v) => (
              <div key={v.id} className="rounded-xl border border-line p-3">
                <p className="text-sm font-semibold">Version {v.version} <span className={`chip ml-2 ${v.status === "published" ? "chip-live" : "chip-locked"}`}>{v.status}</span></p>
                <p className="text-xs text-muted">Saved {date(v.created_at)}{v.published_at ? ` · Published ${date(v.published_at)}` : ""}</p>
                {v.note && <p className="mt-1 text-xs">{v.note}</p>}
                {v.status !== "published" && (
                  <ActionForm action={publishCurriculumVersion} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="section" value={section} />
                    <input name="confirm" placeholder="Type PUBLISH" aria-label="Type PUBLISH to confirm" className="field !py-1.5 text-sm" />
                    <button className="btn btn-ghost btn-sm shrink-0">{v.status === "archived" ? "Restore" : "Publish"}</button>
                  </ActionForm>
                )}
              </div>
            ))}
            <Link href={`/app/know-yourself/${section}`} className="inline-block text-sm text-gold">View the member page →</Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
