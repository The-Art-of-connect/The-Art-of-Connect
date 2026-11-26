import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { loadAnswers } from "@/lib/onboarding-server";
import { DEFAULT_REGISTRY, stageProgress } from "@/lib/onboarding";
import { LuxCard, LuxSection, Notice, SafetyFooter } from "@/components/Lux";

export const metadata = { title: "Your Relationship Readiness Profile" };

const AREAS: [string, string][] = [
  ["Self-awareness", "Recognized strength"],
  ["Communication", "Developing strength"],
  ["Accountability", "Recognized strength"],
  ["Emotional regulation", "Opportunity for growth"],
  ["Personal boundaries", "Developing strength"],
  ["Relationship intentions", "Clearly expressed"],
];

export default async function Readiness() {
  const { viewer } = await requireExperience("relationships");
  const answers = await loadAnswers(viewer.id);
  const done = stageProgress(DEFAULT_REGISTRY, "readiness", { track: "single", answers }).complete;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-[2rem] border border-gold/30 p-7 sm:p-10" style={{ background: "var(--cream)" }}>
        <p className="text-xs tracking-[0.25em] text-gold-deep uppercase">Your private discovery report</p>
        <h1 className="display mt-3 text-5xl" style={{ color: "var(--burgundy)" }}>Understanding You</h1>
        <p className="mt-2 text-sm text-faint">{done ? "Your personal results are prepared once our professionally reviewed scoring is approved." : "Illustrative results for a fictional member. Complete Emotional & Relationship Readiness to receive your own."}</p>
        <dl className="mt-8 divide-y divide-gold/25">
          {AREAS.map(([a, r]) => (
            <div key={a} className="flex items-center justify-between gap-4 py-4">
              <dt className="text-lg">{a}</dt>
              <dd className="text-sm text-gold-deep">{r}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 rounded-2xl p-6" style={{ background: "#e2d2b8" }}>
          <p className="display text-2xl text-gold-deep">Journey recommends</p>
          <p className="mt-2 text-lg font-semibold">Understanding emotional triggers</p>
          <p className="mt-1 text-muted">Explore a guided seven-day educational experience focused on emotional awareness and communication.</p>
        </div>
        <p className="mt-6 text-sm text-muted">Additional support is available if you choose to speak with a qualified counselor or coach — always your choice, never a requirement.</p>
      </div>
      <LuxSection title="What these results mean — and don't">
        <div className="grid gap-5 sm:grid-cols-2">
          <LuxCard title="Educational, not clinical" body="This is a reflection tool. It never diagnoses you or labels you with a condition." />
          <LuxCard title="Never held against you" body="Your results, seeking counseling or sharing a health condition never affect your matchmaking." />
          <LuxCard title="Yours alone" body="Your report is private. Matches, partners and our team can't read it." />
          <LuxCard title="Grow and revisit" body="Explore the recommended activities, reflect, and retake the reflection whenever you'd like." />
        </div>
      </LuxSection>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app/journey/daily" className="btn btn-gold">Start a growth activity</Link>
        <Link href="/app/relationships/onboarding/readiness" className="btn btn-ghost">Revisit my reflection</Link>
      </div>
      <div className="mt-8"><Notice>Readiness results are educational and kept separate from safety decisions, which are always made by trained people.</Notice></div>
      <SafetyFooter />
    </div>
  );
}
