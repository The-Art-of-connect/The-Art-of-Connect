import Link from "next/link";
import { EXPERIENCES, type Experience } from "@/lib/experiences";

export function ExperienceShell({ experience, preview, children }: { experience: Experience; preview: boolean; children: React.ReactNode }) {
  const e = EXPERIENCES[experience];
  return (
    <>
      {preview && (
        <div className="mb-8 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">
          Staff preview — this experience is not open to members yet.
        </div>
      )}
      <p className="text-xs tracking-[0.3em] uppercase" style={{ color: e.accent }}>{e.subtitle}</p>
      <h1 className="display mt-4 text-5xl">{e.name}</h1>
      <p className="mt-3 text-muted">{e.caption}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">{children}</div>
    </>
  );
}

export function ModuleCard({ title, body, status = "In development", href }: { title: string; body: string; status?: string; href?: string }) {
  const card = (
    <section className={`glass h-full p-7 ${href ? "transition hover:-translate-y-0.5 hover:border-gold/60" : ""}`}>
      <span className={`chip ${href ? "chip-live" : ""}`}>{href ? "Open" : status}</span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {href && <p className="mt-4 text-sm font-semibold text-gold-deep">Explore →</p>}
    </section>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
}
