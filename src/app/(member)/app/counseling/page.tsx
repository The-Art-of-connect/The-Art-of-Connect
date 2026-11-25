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
      <ModuleCard title="Personal growth dashboard" body="Your goals, daily practices and progress in one place." href="/app/journey/daily" />
      <ModuleCard title="Guided self-discovery" body="The ten Arts — from The Art of Self to The Art of Becoming." href="/app/journey/library" />
      <ModuleCard title="Emotional intelligence" body="Reflections and exercises to grow self-awareness and empathy." href="/app/readiness" />
      <ModuleCard title="Private journal" body="Visible only to you — not to partners, matches or The Art of Connect team." href="/app/counseling/journal" />
      <ModuleCard title="Journey" body="Your AI connection concierge for self-discovery and personal growth." href="/app/journey" />
      <ModuleCard title="Counselors & coaches" body="The Professional Therapy & Counseling Center — verified, licensed professionals." href="/app/counseling/professionals" />
      <ModuleCard title="Professional referrals" body="Share information with a professional only with your explicit consent." />
    </ExperienceShell>
  );
}
