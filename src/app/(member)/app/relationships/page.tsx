import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("relationships");
  return (
    <ExperienceShell experience="relationships" preview={preview}>
      <div className="md:col-span-2 text-xs tracking-[0.25em] uppercase text-faint">For singles</div>
      <ModuleCard title="Relationship readiness" body="Reflect on what you’re seeking and what you’re ready to give." />
      <ModuleCard title="Personality & compatibility" body="Assessments of values, attachment, communication and life vision." />
      <ModuleCard title="Intentional matchmaking" body="Curated introductions with the reasons you may be well suited. Only singles appear here." />
      <ModuleCard title="Your In Love profile" body="Used only in In Love, with private photo controls and visibility settings." />
      <div className="md:col-span-2 mt-4 text-xs tracking-[0.25em] uppercase text-faint">For couples</div>
      <ModuleCard title="Invite your partner" body="Send a secure invitation. Your shared space opens only when your partner accepts." />
      <ModuleCard title="Shared relationship space" body="Goals, guided conversations and connection activities you share together." />
      <ModuleCard title="Private reflections" body="Your individual reflections — never shared with your partner unless you choose." />
      <ModuleCard title="Professional support" body="Consent-based referrals to counselors and coaches, and appointment scheduling." />
    </ExperienceShell>
  );
}
