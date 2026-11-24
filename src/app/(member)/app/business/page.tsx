import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("business");
  return (
    <ExperienceShell experience="business" preview={preview}>
      <ModuleCard title="Your professional profile" body="Company, stage, what you’re seeking and offering — visible only within Business." />
      <ModuleCard title="Business compatibility" body="Introductions matched on goals, stage and working style." />
      <ModuleCard title="Referral exchange" body="Give and receive trusted referrals with a clear record of every introduction." />
      <ModuleCard title="Collaboration rooms" body="Private spaces to shape partnerships and projects." />
    </ExperienceShell>
  );
}
