import Link from "next/link";
import { hasRole, requireStaff } from "@/lib/auth";
import { FINANCE_VIEWERS, countRows, money } from "@/lib/admin";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { NotConnected, PageHeader, Panel, Stat } from "@/components/admin/ui";

async function monthlyRecurring() {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase.from("subscriptions").select("monthly_equivalent_cents").in("status", ["active", "trialing", "past_due"]);
  return (data ?? []).reduce((sum, row) => sum + (row.monthly_equivalent_cents ?? 0), 0);
}

export default async function AdminOverview() {
  const viewer = await requireStaff();
  const launch = await getLaunchState();
  // General staff never see confidential financial figures.
  const finance = hasRole(viewer, FINANCE_VIEWERS);
  const [members, active, waitlist, applications, tickets, reports, mrr, failed, canceled] = await Promise.all([
    countRows("profiles"),
    countRows("subscriptions", (q) => q.eq("status", "active")),
    countRows("waitlist"),
    countRows("applications", (q) => q.in("status", ["submitted", "in_review"]), "counseling"),
    countRows("support_tickets", (q) => q.in("status", ["open", "pending"])),
    countRows("moderation_reports", (q) => q.in("status", ["open", "reviewing"])),
    monthlyRecurring(),
    countRows("payments", (q) => q.eq("status", "failed")),
    countRows("subscriptions", (q) => q.eq("status", "canceled")),
  ]);

  const switches: [string, boolean][] = [
    ["Public registrations", launch.registrations_open],
    ["Live payments", launch.payments_live],
    ["In Business", launch.business_live],
    ["In Life", launch.counseling_live],
    ["In Love", launch.relationships_live],
    ["Professional applications", launch.counselor_applications_open],
  ];

  return (
    <>
      {!isSupabaseConfigured() && <NotConnected />}
      <PageHeader eyebrow="Command" title={`Good day${viewer.displayName ? ", " + viewer.displayName : ""}.`} />
      {finance && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active memberships" value={active} accent="var(--success)" />
          <Stat label="Monthly recurring" value={money(mrr)} accent="var(--gold-bright)" />
          <Stat label="Annual recurring" value={money(mrr * 12)} hint="Monthly recurring × 12" />
          <Stat label="Failed payments" value={failed} accent="var(--danger)" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Members" value={members} />
        <Stat label="Notify-me list" value={waitlist} />
        {finance && <Stat label="Cancellations" value={canceled} />}
        <Stat label="Pending professional applications" value={applications} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Launch status" action={viewer.roles.includes("owner") ? <Link href="/admin/settings" className="text-xs text-gold">Manage →</Link> : null}>
          <ul className="divide-y divide-line">
            {switches.map(([label, on]) => (
              <li key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className={`chip ${on ? "chip-live" : "chip-locked"}`}>{on ? "Live" : "Locked"}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Needs attention">
          <ul className="divide-y divide-line">
            {[
              ["Professional applications awaiting review", applications, "/admin/counselors"],
              ["Open support tickets", tickets, "/admin/support"],
              ["Open moderation reports", reports, "/admin/moderation"],
            ].map(([label, n, href]) => (
              <li key={String(href)}>
                <Link href={String(href)} className="flex items-center justify-between px-5 py-4 text-sm hover:bg-ink-3">
                  <span className="text-muted">{label}</span>
                  <span className="display text-2xl text-gold-bright">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
