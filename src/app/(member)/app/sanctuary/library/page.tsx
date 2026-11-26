import Link from "next/link";
import { publishedContent } from "@/lib/sanctuary-server";
import { TOPICS } from "@/lib/sanctuary";
import { LuxHero, LuxSection, Notice } from "@/components/Lux";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";

export const metadata = { title: "Library · My Daily Sanctuary" };
export const dynamic = "force-dynamic";

/** The owner-managed educational library: short lessons by topic, grouped into mini-courses. Free with every account. */
export default async function SanctuaryLibrary() {
  const lessons = await publishedContent(["lesson"]);
  const courses = [...new Set(lessons.map((l) => l.course).filter(Boolean))] as string[];
  const title = (slug: string) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return (
    <>
      <LuxHero eyebrow="My Daily Sanctuary" title="The Sanctuary Library" tagline="Short lessons for a well-lived life." />
      <SanctuaryTabs current="/app/sanctuary/library" />
      {!lessons.length && <p className="glass p-6 text-sm text-muted">Lessons will appear here once The Art of Connect publishes them.</p>}
      {courses.map((c) => (
        <LuxSection key={c} eyebrow="Mini-course" title={title(c)}>
          <ol className="grid gap-3 md:grid-cols-2">
            {lessons.filter((l) => l.course === c).map((l, i) => (
              <li key={l.id}><Link href={`/app/sanctuary/library/${l.id}`} className="glass block p-5 transition hover:border-gold">
                <span className="text-xs text-gold-deep">Lesson {i + 1}{l.topic ? ` · ${TOPICS.find(([k]) => k === l.topic)?.[1]}` : ""}</span>
                <span className="display mt-1 block text-xl">{l.title}</span></Link></li>
            ))}
          </ol>
        </LuxSection>
      ))}
      {TOPICS.filter(([k]) => lessons.some((l) => !l.course && l.topic === k)).map(([k, label]) => (
        <LuxSection key={k} eyebrow="Topic" title={label}>
          <ul className="grid gap-3 md:grid-cols-2">{lessons.filter((l) => !l.course && l.topic === k).map((l) => <li key={l.id}><Link href={`/app/sanctuary/library/${l.id}`} className="glass block p-5 hover:border-gold"><span className="display block text-xl">{l.title}</span></Link></li>)}</ul>
        </LuxSection>
      ))}
      <Notice>Educational content for reflection and growth. It is not therapy, financial advice or a clinical assessment.</Notice>
    </>
  );
}
