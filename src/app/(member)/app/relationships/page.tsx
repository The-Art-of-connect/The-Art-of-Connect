import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("relationships");
  return (
    <ExperienceShell experience="relationships" preview={preview}>
      <ModuleCard title="Your relationship profile" body="A profile used only in Relationships, with private photo controls and visibility settings." />
      <ModuleCard title="Compatibility assessments" body="Values, attachment, communication and life-vision assessments that power your introductions." />
      <ModuleCard title="Curated introductions" body="A small set of thoughtful matches, each with the reasons you may be well suited." />
      <ModuleCard title="Couples’ growth studio" body="Shared check-ins, prompts and goals for couples building something lasting." />
    </ExperienceShell>
  );
}
