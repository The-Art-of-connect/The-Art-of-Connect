import "server-only";
import type { StaffRole } from "@/lib/experiences";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_SECTIONS: { href: string; label: string; roles: StaffRole[]; group: string }[] = [
  { href: "/admin", label: "Overview", roles: ["owner", "admin", "support", "moderator", "finance"], group: "Command" },
  { href: "/admin/launch", label: "Launch readiness", roles: ["owner", "admin", "finance"], group: "Command" },
  { href: "/admin/analytics", label: "Analytics", roles: ["owner", "admin"], group: "Command" },
  { href: "/admin/members", label: "Members", roles: ["owner", "admin", "support"], group: "People" },
  { href: "/admin/counselors", label: "Professional applications", roles: ["owner", "admin"], group: "People" },
  { href: "/admin/access", label: "Access & referrals", roles: ["owner", "admin"], group: "People" },
  { href: "/admin/memberships", label: "Memberships", roles: ["owner", "admin", "finance"], group: "Revenue" },
  { href: "/admin/pricing", label: "Pricing & packages", roles: ["owner", "finance"], group: "Revenue" },
  { href: "/admin/revenue", label: "Payments", roles: ["owner", "finance"], group: "Revenue" },
  { href: "/admin/reports", label: "Financial reports", roles: ["owner", "finance"], group: "Revenue" },
  { href: "/admin/marketing", label: "Marketing & promotions", roles: ["owner", "admin"], group: "Growth" },
  { href: "/admin/support", label: "Customer support", roles: ["owner", "admin", "support"], group: "Care" },
  { href: "/admin/moderation", label: "Content moderation", roles: ["owner", "admin", "moderator"], group: "Care" },
  { href: "/admin/safety", label: "Trust & safety", roles: ["owner", "admin", "moderator"], group: "Care" },
  { href: "/admin/security", label: "Security Center", roles: ["owner", "admin"], group: "Platform" },
  { href: "/admin/team", label: "Team & permissions", roles: ["owner"], group: "Platform" },
  { href: "/admin/settings", label: "Launch controls & settings", roles: ["owner"], group: "Platform" },
];

export const rolesFor = (href: string) => ADMIN_SECTIONS.find((s) => s.href === href)!.roles;

export const money = (cents: number | null | undefined, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format((cents ?? 0) / 100);

export const date = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso)) : "—";

/** Row count for a table the current staff member is allowed to read. */
export async function countRows(table: string, filter?: (q: any) => any, schema = "public") {
  const supabase = await createClient();
  if (!supabase) return 0;
  let q: any = supabase.schema(schema).from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export async function audit(action: string, targetTable?: string, targetId?: string, details: Record<string, unknown> = {}) {
  const supabase = await createClient();
  await supabase?.rpc("log_admin_action", { action, target_table: targetTable ?? null, target_id: targetId ?? null, details });
}
