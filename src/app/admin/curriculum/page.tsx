import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CURRICULA } from "@/lib/curricula";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Curriculum Studio" };
export const dynamic = "force-dynamic";

export default async function CurriculumStudio() {
  await requireStaff(rolesFor("/admin/curriculum"));
  const supabase = await createClient();
  const { data } = supabase ? await supabase.from("curriculum_versions").select("section, version, status").order("version", { ascending: false }) : { data: [] };
  return (
    <>
      <PageHeader eyebrow="The Art of Self" title="Curriculum Studio" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Edit lessons, questions, guided answers, analysis wording and Journey&rsquo;s teaching instructions, with no code. Every save becomes a new version, and members only see what you publish.</p>
      <Panel title="My Daily Sanctuary">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-muted">Daily practices, lessons, scenarios and weekly and monthly reflections for every account. Prepare and schedule in advance; only what you publish reaches members.</p>
          <Link href="/admin/curriculum/sanctuary" className="btn btn-gold btn-sm">Open</Link>
        </div>
      </Panel>
      <Panel title="Business & Tax source library">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-muted">Primary IRS, SBA and state sources for the Business &amp; Tax Education Center, labeled by tax year and jurisdiction. Journey teaches only from sources you approve.</p>
          <Link href="/admin/curriculum/sources" className="btn btn-gold btn-sm">Open</Link>
        </div>
      </Panel>
      <Panel title="Curricula">
        <ul className="divide-y divide-line">
          {Object.values(CURRICULA).map((c) => {
            const v = (data ?? []).filter((x) => x.section === c.section);
            const pub = v.find((x) => x.status === "published");
            return (
              <li key={c.section} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted">{pub ? `Published: version ${pub.version}` : "Members see the founding version (V1.0)"} · {v.length} saved version{v.length === 1 ? "" : "s"}</p>
                </div>
                <Link href={`/admin/curriculum/${c.section}`} className="btn btn-gold btn-sm">Edit</Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
