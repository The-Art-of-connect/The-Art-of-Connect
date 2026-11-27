import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/membership-server";
import { atLeast } from "@/lib/membership-level";
import { normalizeResume } from "@/lib/resume";
import { MemberForm } from "@/components/MemberForm";
import { uploadResume } from "@/app/actions/resume";

export const metadata = { title: "My Professional Readiness" };
export const dynamic = "force-dynamic";

type Row = { id: string; title: string; status: string; is_master: boolean; approved_at: string | null; updated_at: string; data: unknown; opportunity: string | null; source: string };
const DAY = 86_400_000;

/**
 * Professional onboarding and the Professional Readiness Dashboard (founder directives 33–34).
 * Every figure comes from the member's own records; nothing here is illustrative.
 */
export default async function Career() {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const membership = await getMembership(viewer);
  const premium = membership ? atLeast(membership.level, "executive") : false;
  const { data } = live && db ? await db.from("resumes").select("id, title, status, is_master, approved_at, updated_at, data, opportunity, source").eq("user_id", viewer.id).eq("kind", "resume").order("updated_at", { ascending: false }) : { data: [] };
  const list = (data ?? []) as Row[];
  const approved = list.filter((r) => r.status === "approved");
  const master = list.find((r) => r.is_master) ?? approved[0] ?? list[0];
  const md = master ? normalizeResume(master.data) : null;
  const lastApproved = approved.map((r) => Date.parse(r.approved_at ?? "")).filter(Boolean).sort((a, b) => b - a)[0];
  const items = [
    { label: "Professional résumé on file", done: list.length > 0 },
    { label: "Résumé approved by you as accurate", done: approved.length > 0 },
    { label: "Master professional history chosen", done: list.some((r) => r.is_master) },
    { label: "Professional history with highlights", done: Boolean(md?.experience.some((e) => e.highlights.length)) },
    { label: "Education and credentials", done: Boolean(md && (md.education.length || md.certifications.length)) },
    { label: "Professional summary", done: (md?.summary.length ?? 0) >= 80 },
    { label: "Reviewed within the last six months", done: Boolean(lastApproved && Date.now() - lastApproved < 182 * DAY) },
  ];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  const pending = list.filter((r) => r.status === "pending_approval");
  const reviewDue = Boolean(lastApproved && Date.now() - lastApproved > 182 * DAY);

  return (
    <>
      <section className="theme-dark relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-14" style={{ background: "var(--ink)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--glow)" }} aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow">The Art of Connect · Professional Portfolio</p>
          <h1 className="display mt-4 max-w-3xl text-4xl text-gold-bright sm:text-6xl">Let&apos;s prepare you for your next opportunity.</h1>
          <p className="display mt-4 text-xl italic text-muted sm:text-2xl">Your experience deserves to be presented at its best.</p>
          {premium && !approved.length && (
            <p className="mt-6 max-w-2xl rounded-2xl border border-[var(--champagne)]/40 bg-white/5 px-5 py-4 text-sm text-text">
              As an Executive or Elite member, an approved résumé is part of your professional onboarding. It&apos;s needed before professional introductions or applications are made on your behalf. Everything else in your membership is available while you prepare it.
            </p>
          )}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--champagne)]/35 bg-white/[0.04] p-6">
              <p className="text-2xl text-gold" aria-hidden="true">⤒</p>
              <h2 className="display mt-2 text-2xl text-gold-bright">Upload my existing résumé</h2>
              <p className="mt-2 text-sm text-muted">{membership && membership.level !== "free" ? "Journey reviews it and prepares an enhanced draft for your approval. Your original is always kept." : "We keep your original safely, and you can rebuild it in our templates. Journey's enhancement is part of paid memberships."}</p>
              <MemberForm action={uploadResume} className="mt-4 space-y-3">
                <input type="file" name="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-[var(--champagne)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--ink)]" />
                <button className="btn btn-gold btn-sm w-full">Upload securely</button>
                <p className="text-xs text-faint">PDF or Word, up to 5 MB. Private to you.</p>
              </MemberForm>
            </div>
            <Link href="/app/career/resume#templates" className="rounded-2xl border border-[var(--champagne)]/35 bg-white/[0.04] p-6 transition hover:border-[var(--champagne)]">
              <p className="text-2xl text-gold" aria-hidden="true">✎</p>
              <h2 className="display mt-2 text-2xl text-gold-bright">Build my résumé</h2>
              <p className="mt-2 text-sm text-muted">Choose a refined template and follow the guided sections, with examples to learn from at every step.</p>
              <span className="btn btn-ghost btn-sm mt-4">Choose a template</span>
            </Link>
            <Link href={master ? `/app/career/resume/${master.id}` : "/app/career/resume"} className="rounded-2xl border border-[var(--champagne)]/35 bg-white/[0.04] p-6 transition hover:border-[var(--champagne)]">
              <p className="text-2xl text-gold" aria-hidden="true">✓</p>
              <h2 className="display mt-2 text-2xl text-gold-bright">Use my saved résumé</h2>
              <p className="mt-2 text-sm text-muted">{master ? `Review and approve "${master.title}", or choose another.` : "Your saved résumés will appear here."}</p>
              <span className="btn btn-ghost btn-sm mt-4">{master ? "Review" : "View my résumés"}</span>
            </Link>
          </div>
          <p className="mt-6 text-xs tracking-[0.2em] text-gold">PRIVATE · PROFESSIONAL · OPPORTUNITY READY</p>
        </div>
      </section>

      {(pending.length > 0 || reviewDue) && (
        <div className="mt-6 space-y-3">
          {pending.map((r) => <Link key={r.id} href={`/app/career/resume/${r.id}`} className="glass block p-4 text-sm"><span className="chip chip-locked mr-2">Awaiting your approval</span>{r.title}</Link>)}
          {reviewDue && <p className="glass p-4 text-sm">It&apos;s been more than six months since you last approved your résumé. A quick review keeps it current.</p>}
        </div>
      )}

      <section className="theme-dark mt-8 rounded-[2rem] p-6 sm:p-10" style={{ background: "var(--ink)" }}>
        <p className="eyebrow">CONNECT 360 · My Professional Office</p>
        <h2 className="display mt-2 text-3xl text-gold-bright sm:text-4xl">My Professional Readiness</h2>
        <p className="display mt-4 text-5xl text-gold">{pct}%</p>
        <p className="mt-1 text-sm text-muted">Portfolio completeness</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--champagne)]" style={{ width: `${pct}%` }} /></div>
        <ul className="mt-6 divide-y divide-white/10">
          {items.map((i) => (
            <li key={i.label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className="flex items-center gap-3"><span className={i.done ? "text-gold" : "text-[var(--champagne)]/60"}>{i.done ? "✓" : "!"}</span>{i.label}</span>
              <span className={i.done ? "text-muted" : "text-gold"}>{i.done ? "Complete" : "Outstanding"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-faint">This measures how complete your portfolio is, not your worth or suitability for any opportunity. References, work samples, reels and opportunity preferences will be added with the Professional Opportunity Portfolio.</p>
      </section>

      {list.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">My résumés</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <li key={r.id}><Link href={`/app/career/resume/${r.id}`} className="glass block p-5">
                <p className="font-semibold">{r.title}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  {r.is_master && <span className="chip chip-live">Master history</span>}
                  <span className={`chip ${r.status === "approved" ? "chip-live" : "chip-locked"}`}>{r.status === "approved" ? "Approved" : r.status === "pending_approval" ? "Awaiting approval" : "Draft"}</span>
                  {r.opportunity && <span className="chip">For {r.opportunity}</span>}
                </p>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
