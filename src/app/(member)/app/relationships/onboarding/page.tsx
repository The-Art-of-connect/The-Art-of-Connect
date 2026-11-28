import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { loadOnboardingDraft } from "@/lib/onboarding-server";
import { DEFAULT_REGISTRY, STAGES, resumePoint, stageProgress } from "@/lib/onboarding";
import { LuxHero, Notice } from "@/components/Lux";

export const metadata = { title: "Your Personal Society journey" };

export default async function OnboardingHub() {
  const { viewer } = await requireExperience("relationships");
  const { answers, reflections } = await loadOnboardingDraft(viewer.id);
  const started = Object.keys(answers).length > 0 || Object.keys(reflections).length > 0;
  const ctx = { track: "single" as const, answers };
  const resume = resumePoint(DEFAULT_REGISTRY, ctx);
  return (
    <>
      <LuxHero eyebrow="The Personal Society · Singles 30+" title="Before we connect you with someone, let's connect with you." tagline="Your journey begins with understanding, not judgment." tone="burgundy">
        {resume ? (
          <Link href={`/app/relationships/onboarding/${resume.stage}`} className="btn btn-gold">{started ? "Continue where you left off" : "Begin"}</Link>
        ) : (
          <Link href="/app/readiness" className="btn btn-gold">Check readiness results status</Link>
        )}
      </LuxHero>
      <ol className="mt-10 space-y-4">
        {STAGES.map((s) => {
          const p = stageProgress(DEFAULT_REGISTRY, s.id, ctx);
          return (
            <li key={s.id}>
              <Link href={`/app/relationships/onboarding/${s.id}`} className="glass group flex flex-col gap-4 p-6 transition hover:border-gold/60 sm:flex-row sm:items-center sm:p-7">
                <span className="display text-5xl text-gold">{s.order}</span>
                <span className="flex-1">
                  <span className="block text-xl font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm text-muted">{s.purpose}</span>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-gold/15"><span className="block h-full rounded-full bg-gold" style={{ width: `${p.percent}%` }} /></span>
                </span>
                <span className="shrink-0 text-sm text-faint sm:text-right">
                  <span className="block">{s.minutes[0]}–{s.minutes[1]} minutes</span>
                  <span className="block font-semibold text-gold-deep">{p.complete ? "Complete ✓" : `${p.answered} of ${p.total} answered`}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="mt-8 space-y-3">
        <Notice>Save your progress before leaving a stage. You can return to your saved answers on any device. Readiness results are still under review.</Notice>
        <Notice>Before matchmaking begins, we verify your email, identity, age and a current photo. Your legal name, date of birth and verification details are never shown to other members.</Notice>
      </div>
    </>
  );
}
