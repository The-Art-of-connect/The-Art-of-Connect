import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/resume";
import { LuxHero } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createResume } from "@/app/actions/resume";

export const metadata = { title: "Résumé Builder" };
export const dynamic = "force-dynamic";

const ACCENT: Record<string, string> = { signature: "Serif headings · fine gold rule", executive: "Leadership profile first", foundation: "Education and skills lead", transition: "Transferable strengths first", letter: "Matching letterhead" };

/** Complimentary Résumé Builder (founder directive 31): templates, saved résumés and cover letters. */
export default async function ResumeHome() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const { data } = live && db ? await db.from("resumes").select("id, title, kind, template, status, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }) : { data: [] };
  const list = data ?? [];
  return (
    <>
      <LuxHero eyebrow="Complimentary with every account" title="Résumé Builder" tagline="Present your experience with clarity and polish.">
        <div className="flex flex-wrap gap-3"><Link href="/app/career" className="btn btn-ghost btn-sm">My Professional Readiness</Link></div>
      </LuxHero>

      {list.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">Saved</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <li key={r.id}><Link href={`/app/career/resume/${r.id}`} className="glass block p-5 transition hover:-translate-y-0.5">
                <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">{r.kind === "letter" ? "Cover letter" : TEMPLATES.find((t) => t.key === r.template)?.name}</p>
                <p className="display mt-1 text-xl">{r.title}</p>
                <p className="mt-1 text-xs text-faint">Updated {new Date(r.updated_at).toLocaleDateString()}{r.status === "approved" ? " · Approved" : r.status === "pending_approval" ? " · Awaiting your approval" : ""}</p>
              </Link></li>
            ))}
          </ul>
        </section>
      )}

      <section id="templates" className="mt-12 scroll-mt-24">
        <p className="eyebrow">Begin</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">Choose a template</h2>
        <p className="mt-3 max-w-2xl text-muted">Every layout is a single column with standard headings, which applicant tracking systems read cleanly. You can switch templates at any time.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <MemberForm key={t.key} action={createResume} className="glass glass-edge flex flex-col overflow-hidden !p-0">
              <div className="relative h-44 bg-[#fdfbf7] p-5" aria-hidden="true">
                <div className="h-3 w-32 rounded bg-[#211f1c]" /><div className="mt-1.5 h-2 w-20 rounded bg-[#5e5a54]/50" />
                <div className="mt-2 h-px w-full bg-[#A88A5C]" />
                {[0, 1, 2].map((i) => <div key={i} className="mt-3"><div className="h-1.5 w-16 rounded bg-[#A88A5C]" /><div className="mt-1.5 h-1.5 w-full rounded bg-[#211f1c]/15" /><div className="mt-1 h-1.5 w-4/5 rounded bg-[#211f1c]/15" /></div>)}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">{t.audience}</p>
                <h3 className="display mt-1 text-2xl">{t.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{t.description}</p>
                <p className="mt-2 text-xs text-faint">{ACCENT[t.key]}</p>
                <input type="hidden" name="template" value={t.key} />
                <button className="btn btn-gold btn-sm mt-4">{t.kind === "letter" ? "Write a cover letter" : "Use this template"}</button>
              </div>
            </MemberForm>
          ))}
        </div>
      </section>
      <p className="mt-10 text-center text-xs text-faint">Your résumés are private to you. We never add experience, education or credentials you didn&apos;t provide.</p>
    </>
  );
}
