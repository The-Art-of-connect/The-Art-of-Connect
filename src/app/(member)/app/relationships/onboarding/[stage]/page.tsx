import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExperience } from "@/lib/auth";
import { DEFAULT_REGISTRY, STAGES, applicableQuestions, reuseAnswers, stageProgress, type StageId } from "@/lib/onboarding";
import { StageForm } from "@/components/StageForm";
import { loadOnboardingDraft } from "@/lib/onboarding-server";

export const metadata = { title: "Your Personal Society journey" };

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  const s = STAGES.find((x) => x.id === stage);
  if (!s) notFound();
  const { viewer } = await requireExperience("relationships");
  const draft = await loadOnboardingDraft(viewer.id);
  const answers = reuseAnswers(DEFAULT_REGISTRY, { track: "single", answers: draft.answers });
  const questions = applicableQuestions(DEFAULT_REGISTRY, stage as StageId, { track: "single", answers });
  const progress = stageProgress(DEFAULT_REGISTRY, stage as StageId, { track: "single", answers });
  const next = STAGES[s.order];
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/relationships/onboarding" className="text-sm text-gold-deep hover:underline">← All stages</Link>
      <p className="eyebrow mt-6">Stage {s.order} of {STAGES.length} · about {s.minutes[0]}–{s.minutes[1]} minutes</p>
      <h1 className="display mt-3 text-5xl">{s.title}</h1>
      <p className="mt-3 text-muted">{s.purpose}</p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gold/15" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Stage progress">
        <div className="h-full rounded-full bg-gold" style={{ width: `${progress.percent}%` }} />
      </div>
      <StageForm stage={s.id} questions={questions} answers={answers} reflections={draft.reflections} nextLabel={next ? "Save and continue" : "Save and finish"} />
      {s.id === "readiness" && <p className="mt-6 text-center text-xs text-faint">A reflection exercise, not a clinical assessment. Your answers are private.</p>}
    </div>
  );
}
