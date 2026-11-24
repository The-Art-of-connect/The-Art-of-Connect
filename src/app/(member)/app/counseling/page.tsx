import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("counseling");
  return (
    <ExperienceShell experience="counseling" preview={preview}>
      <div className="md:col-span-2 rounded-2xl border border-line-strong bg-ink-2 p-5 text-sm text-muted">
        Private space. Your journal and reflections are visible only to you, and your In Life activity never appears on
        your In Love or In Business profiles.
      </div>
      <ModuleCard title="Personal growth dashboard" body="Your goals, pathways and progress in one place." />
      <ModuleCard title="Guided self-discovery" body="Identity exploration, inner-child reflection and attachment style exploration." />
      <ModuleCard title="Emotional intelligence" body="Assessments and exercises to grow self-awareness and empathy." />
      <ModuleCard title="Private journal" body="Visible only to you — not to partners, matches or The Art of Connect team." />
      <ModuleCard title="Counselors & coaches" body="Find reviewed professionals, clearly marked as licensed or nonclinical." />
      <ModuleCard title="Professional referrals" body="Share information with a professional only with your explicit consent." />
    </ExperienceShell>
  );
}
