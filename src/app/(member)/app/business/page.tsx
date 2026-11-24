import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("business");
  return (
    <ExperienceShell experience="business" preview={preview}>
      <ModuleCard title="Your professional profile" body="Company, stage, what you’re seeking and offering — visible only within In Business." />
      <ModuleCard title="Business compatibility" body="Introductions matched on goals, stage, values and working style." />
      <ModuleCard title="Mentorship" body="Find a mentor, or offer your experience to others." />
      <ModuleCard title="Partnerships & collaboration" body="Strategic partners and collaborators who complement your strengths." />
    </ExperienceShell>
  );
}
