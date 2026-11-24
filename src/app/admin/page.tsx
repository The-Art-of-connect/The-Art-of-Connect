import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { countRows, money } from "@/lib/admin";
import { getLaunchState } from "@/lib/launch";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { NotConnected, PageHeader, Panel, Stat } from "@/components/admin/ui";

async function monthlyRecurring() {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("subscriptions")
    .select("membership_plans(price_cents, billing_interval)")
    .in("status", ["active", "trialing", "past_due"]);
  return (data ?? []).reduce((sum, row: any) => {
    const p = row.membership_plans;
    if (!p) return sum;
    return sum + (p.billing_interval === "year" ? p.price_cents / 12 : p.price_cents);
  }, 0);
}

export default async function AdminOverview() {
  const viewer = await requireStaff();
  const launch = await getLaunchState();
  const [members, active, waitlist, applications, tickets, reports, mrr] = await Promise.all([
    countRows("profiles"),
    countRows("subscriptions", (q) => q.eq("status", "active")),
    countRows("waitlist"),
    countRows("applications", (q) => q.in("status", ["submitted", "in_review"]), "counseling"),
    countRows("support_tickets", (q) => q.in("status", ["open", "pending"])),
    countRows("moderation_reports", (q) => q.in("status", ["open", "reviewing"])),
    monthlyRecurring(),
  ]);

  const switches: [string, boolean][] = [
    ["Public registrations", launch.registrations_open],
    ["Live payments", launch.payments_live],
    ["Relationships", launch.relationships_live],
    ["Business", launch.business_live],
    ["Counseling", launch.counseling_live],
    ["Counselor applications", launch.counselor_applications_open],
  ];

  return (
    <>
      {!isSupabaseConfigured() && <NotConnected />}
      <PageHeader eyebrow="Command" title={`Good day${viewer.displayName ? ", " + viewer.displayName : ""}.`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Members" value={members} />
        <Stat label="Active memberships" value={active} accent="var(--success)" />
        <Stat label="Monthly recurring" value={money(mrr)} accent="var(--gold-bright)" />
        <Stat label="Waitlist" value={waitlist} accent="var(--relationships)" />
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
              ["Counselor applications awaiting review", applications, "/admin/counselors"],
              ["Open support tickets", tickets, "/admin/support"],
              ["Open moderation reports", reports, "/admin/moderation"],
            ].map(([label, n, href]) => (
              <li key={String(href)}>
                <Link href={String(href)} className="flex items-center justify-between px-5 py-4 text-sm hover:bg-white/[0.02]">
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
