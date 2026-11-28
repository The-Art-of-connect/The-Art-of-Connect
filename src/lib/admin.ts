import "server-only";
import type { StaffRole } from "@/lib/experiences";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_SECTIONS: { href: string; label: string; roles: StaffRole[]; group: string }[] = [
  { href: "/admin", label: "Overview", roles: ["owner", "executive", "finance", "admin", "support", "moderator"], group: "Command" },
  { href: "/admin/preview", label: "Member view preview", roles: ["owner", "executive", "admin"], group: "Command" },
  { href: "/admin/qa", label: "Quality Assurance Center", roles: ["owner"], group: "Command" },
  { href: "/admin/circle/live", label: "Live Q&A", roles: ["owner", "admin", "moderator"], group: "Command" },
  { href: "/admin/brand", label: "Brand Terminology Registry", roles: ["owner", "admin", "executive"], group: "Command" },
  { href: "/admin/launch", label: "Launch readiness", roles: ["owner", "executive", "finance"], group: "Command" },
  { href: "/admin/analytics", label: "Analytics", roles: ["owner", "executive", "admin"], group: "Command" },
  { href: "/admin/members", label: "Members", roles: ["owner", "executive", "admin", "support"], group: "People" },
  { href: "/admin/elite", label: "Elite Management Center", roles: ["owner"], group: "People" },
  { href: "/admin/assist", label: "Assistance Center", roles: ["owner", "admin"], group: "People" },
  { href: "/admin/social", label: "Community & Social", roles: ["owner", "admin", "moderator"], group: "People" },
  { href: "/admin/circle", label: "Global Conversation Control Center", roles: ["owner", "admin", "moderator"], group: "People" },
  { href: "/admin/vault", label: "Document Vault security", roles: ["owner"], group: "People" },
  { href: "/admin/intelligence", label: "Intelligence Division", roles: ["owner"], group: "People" },
  { href: "/admin/radar", label: "Opportunity Radar", roles: ["owner"], group: "People" },
  { href: "/admin/launch-center", label: "Business Launch Center states", roles: ["owner", "executive"], group: "People" },
  { href: "/admin/formation-orders", label: "Formation requests", roles: ["owner", "finance"], group: "People" },
  { href: "/admin/counselors", label: "Professional applications", roles: ["owner", "executive", "admin"], group: "People" },
  { href: "/admin/access", label: "Access & referrals", roles: ["owner", "executive", "admin"], group: "People" },
  { href: "/admin/memberships", label: "Memberships", roles: ["owner", "executive", "finance"], group: "Revenue" },
  { href: "/admin/pricing", label: "Pricing & packages", roles: ["owner", "finance"], group: "Revenue" },
  { href: "/admin/revenue", label: "Payments", roles: ["owner", "executive", "finance"], group: "Revenue" },
  { href: "/admin/reports", label: "Financial reports", roles: ["owner", "executive", "finance"], group: "Revenue" },
  { href: "/admin/audit", label: "Financial audit trail", roles: ["owner", "finance"], group: "Revenue" },
  { href: "/admin/business", label: "Founding Community & Business Growth", roles: ["owner", "executive", "moderator"], group: "Growth" },
  { href: "/admin/webinars", label: "The Knowledge Exchange (webinars)", roles: ["owner", "executive", "moderator"], group: "Growth" },
  { href: "/admin/marketing", label: "Marketing & promotions", roles: ["owner", "executive", "finance", "admin"], group: "Growth" },
  { href: "/admin/support", label: "Customer support", roles: ["owner", "executive", "admin", "support"], group: "Care" },
  { href: "/admin/moderation", label: "Content moderation", roles: ["owner", "executive", "admin", "moderator"], group: "Care" },
  { href: "/admin/safety", label: "Trust & safety", roles: ["owner", "executive", "admin", "moderator"], group: "Care" },
  { href: "/admin/journey", label: "Journey Intelligence Center", roles: ["owner", "executive", "finance"], group: "Platform" },
  { href: "/admin/curriculum", label: "Curriculum Studio", roles: ["owner", "executive"], group: "Platform" },
  { href: "/admin/reviews", label: "Page reviews & Coming soon", roles: ["owner", "executive"], group: "Platform" },
  { href: "/admin/development", label: "Development tracker", roles: ["owner", "executive"], group: "Platform" },
  { href: "/admin/legal", label: "Legal & Policy Center", roles: ["owner", "executive"], group: "Platform" },
  { href: "/admin/security", label: "Security Center", roles: ["owner", "admin"], group: "Platform" },
  { href: "/admin/team", label: "Team & permissions", roles: ["owner"], group: "Platform" },
  { href: "/admin/settings", label: "Launch controls & settings", roles: ["owner"], group: "Platform" },
];

/** Roles that may see confidential financial information (revenue, payments, subscriptions, promotions). */
export const FINANCE_VIEWERS: StaffRole[] = ["owner", "finance", "executive"];

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
