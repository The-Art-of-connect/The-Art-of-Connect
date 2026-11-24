import { requireStaff } from "@/lib/auth";
import { countRows, rolesFor } from "@/lib/admin";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function AnalyticsPage() {
  await requireStaff(rolesFor("/admin/analytics"));
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [members, new30, rel, biz, couns, waitlist, wlRel, wlBiz, wlCouns, wlProviders, relProfiles, bizProfiles, relConn, bizConn] = await Promise.all([
    countRows("profiles"),
    countRows("profiles", (q) => q.gte("created_at", since30)),
    countRows("experience_access", (q) => q.eq("experience", "relationships").eq("status", "active")),
    countRows("experience_access", (q) => q.eq("experience", "business").eq("status", "active")),
    countRows("experience_access", (q) => q.eq("experience", "counseling").eq("status", "active")),
    countRows("waitlist"),
    countRows("waitlist", (q) => q.contains("interests", ["relationships"])),
    countRows("waitlist", (q) => q.contains("interests", ["business"])),
    countRows("waitlist", (q) => q.contains("interests", ["counseling"])),
    countRows("waitlist", (q) => q.eq("is_counselor", true)),
    countRows("profiles", undefined, "relationships"),
    countRows("profiles", undefined, "business"),
    countRows("connections", (q) => q.eq("status", "accepted"), "relationships"),
    countRows("connections", (q) => q.eq("status", "accepted"), "business"),
  ]);

  return (
    <>
      <PageHeader eyebrow="Command" title="Platform analytics" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Members" value={members} hint={`${new30} new in 30 days`} />
        <Stat label="Relationships access" value={rel} accent="var(--relationships)" />
        <Stat label="Business access" value={biz} accent="var(--business)" />
        <Stat label="Counseling access" value={couns} accent="var(--counseling)" hint="Count only — no client details" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Waitlist demand">
          <ul className="divide-y divide-line text-sm">
            {[["Total", waitlist], ["Relationships", wlRel], ["Business", wlBiz], ["Counseling", wlCouns], ["Counselors interested in providing", wlProviders]].map(([l, n]) => (
              <li key={String(l)} className="flex justify-between px-5 py-3"><span className="text-muted">{l}</span><span className="text-text">{n}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Engagement">
          <ul className="divide-y divide-line text-sm">
            {[["Relationship profiles", relProfiles], ["Business profiles", bizProfiles], ["Accepted relationship connections", relConn], ["Accepted business connections", bizConn]].map(([l, n]) => (
              <li key={String(l)} className="flex justify-between px-5 py-3"><span className="text-muted">{l}</span><span className="text-text">{n}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
