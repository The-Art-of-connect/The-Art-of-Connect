import { requireExperience } from "@/lib/auth";
import { ExperienceShell, ModuleCard } from "@/components/ExperienceShell";

export default async function Page() {
  const { preview } = await requireExperience("counseling");
  return (
    <ExperienceShell experience="counseling" preview={preview}>
      <div className="md:col-span-2 rounded-2xl border border-jade/30 bg-jade/5 p-5 text-sm text-jade">
        Confidential space. Your counseling identity is separate from your other profiles, and session notes are visible
        only to your counselor.
      </div>
      <ModuleCard title="Find a counselor" body="Browse credential-verified counselors by specialty, format and availability." />
      <ModuleCard title="Appointments" body="Request, confirm and manage video, phone or in-person sessions." />
      <ModuleCard title="Provider workspace" body="For counselors: listing, availability, appointments and private session notes." />
      <ModuleCard title="Provider application" body="Submit your license and credentials for verification." />
    </ExperienceShell>
  );
}
