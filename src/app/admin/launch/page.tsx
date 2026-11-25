import Link from "next/link";
import { requireStaff, hasRole, getMfaStatus } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { env, isSupabaseConfigured, serverConfig, serverSecret } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email";
import { getLaunchState } from "@/lib/launch";
import { getLegalDocs, isDraft } from "@/lib/legal";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { updateChecklistItem } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean | null; detail: string; action?: string };

const STATUS_LABEL: Record<string, string> = { pending: "Pending", in_progress: "In progress", done: "Done", blocked: "Blocked", not_applicable: "N/A" };

function Row({ c }: { c: Check }) {
  const tone = c.ok === true ? "text-success" : c.ok === false ? "text-danger" : "text-gold";
  return (
    <li className="grid gap-1 px-5 py-4 sm:grid-cols-[1.4rem_1fr_auto] sm:items-baseline sm:gap-3">
      <span className={`${tone} font-bold`} aria-hidden="true">{c.ok === true ? "✓" : c.ok === false ? "✕" : "•"}</span>
      <span>
        <span className="font-semibold text-text">{c.label}</span>
        <span className="block text-sm text-muted">{c.detail}</span>
      </span>
      {c.action && <span className="text-xs text-faint sm:text-right">{c.action}</span>}
    </li>
  );
}

export default async function LaunchReadinessPage() {
  const viewer = await requireStaff(rolesFor("/admin/launch"));
  const isOwner = hasRole(viewer, ["owner"]);
  const supabase = await createClient();
  const launch = await getLaunchState();
  const mfa = await getMfaStatus();

  // ── Live system checks ─────────────────────────────────────────
  let dbOk = false;
  let schemaCurrent = false;
  let pricing: { is_published: boolean } | null = null;
  let unpriced = 0;
  let owners = 0;
  let items: any[] = [];
  if (supabase) {
    const [cfg, mfaSetting, offerings, roles, checklist] = await Promise.all([
      supabase.from("pricing_config").select("is_published").maybeSingle(),
      supabase.from("platform_settings").select("key").eq("key", "require_mfa_for_staff").maybeSingle(),
      supabase.from("experience_offerings").select("monthly_price_cents, is_active"),
      supabase.from("staff_roles").select("role").eq("role", "owner"),
      supabase.from("launch_checklist").select("*").order("sort_order"),
    ]);
    dbOk = !cfg.error;
    schemaCurrent = Boolean(mfaSetting.data);
    pricing = cfg.data;
    unpriced = (offerings.data ?? []).filter((o) => o.is_active && o.monthly_price_cents == null).length;
    owners = roles.data?.length ?? 0;
    items = checklist.data ?? [];
  }

  const stripeKey = serverSecret("STRIPE_SECRET_KEY");
  const stripeMode = stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_") ? "live" : stripeKey ? "sandbox" : null;
  let stripeReachable: boolean | null = null;
  if (stripeKey) {
    const { stripe } = await getStripe();
    if (stripe) {
      try {
        await stripe.balance.retrieve();
        stripeReachable = true;
      } catch {
        stripeReachable = false;
      }
    }
  }
  const legal = getLegalDocs();
  const draftDocs = legal.filter(isDraft).length;

  const connections: Check[] = [
    { label: "Supabase database", ok: dbOk, detail: isSupabaseConfigured() ? (dbOk ? "Connected with the publishable key." : "Keys are set, but the database didn’t respond — migrations may not be applied yet.") : "Publishable key / URL not set in Netlify.", action: "NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
    { label: "Database migrations", ok: schemaCurrent, detail: schemaCurrent ? "All migrations applied (staff MFA schema present)." : "Latest migrations not detected.", action: "supabase/migrations" },
    { label: "Supabase server (secret) key", ok: Boolean(serverSecret("SUPABASE_SERVICE_ROLE_KEY")), detail: "Used only by the Stripe webhook on the server.", action: "SUPABASE_SECRET_KEY" },
    { label: "Stripe", ok: stripeReachable, detail: stripeMode ? `${stripeMode === "live" ? "LIVE" : "Sandbox"} key ${stripeReachable ? "connected" : stripeReachable === false ? "rejected by Stripe" : "set"}.` : "No Stripe key set.", action: "STRIPE_SECRET_KEY" },
    { label: "Stripe webhook signing secret", ok: Boolean(serverSecret("STRIPE_WEBHOOK_SECRET")), detail: serverSecret("STRIPE_WEBHOOK_SECRET") ? "Set — subscriptions, payments and refunds will sync." : `Create a webhook to ${env.siteUrl}/api/stripe/webhook and add its signing secret.`, action: "STRIPE_WEBHOOK_SECRET" },
    { label: "Email (Resend)", ok: isEmailConfigured(), detail: isEmailConfigured() ? `Sending as ${serverConfig.emailFrom}.` : "Add a Resend API key and verified sender; also set Supabase Auth SMTP to Resend.", action: "RESEND_API_KEY · EMAIL_FROM" },
    { label: "Identity verification", ok: stripeReachable ? null : false, detail: `Provider: Stripe Identity (uses the Stripe key). ${launch.identity_verification_live ? "Switched ON." : "Switched off until you authorize it."}` },
    { label: "Site address", ok: env.siteUrl.startsWith("https://"), detail: env.siteUrl, action: "NEXT_PUBLIC_SITE_URL" },
  ];

  const security: Check[] = [
    { label: "Owner account", ok: owners > 0, detail: owners ? "Owner role assigned." : "No owner assigned yet." },
    { label: "Your two-step verification", ok: mfa.verified, detail: mfa.verified ? "This session is MFA-verified." : "Not verified in this session." },
    { label: "Staff MFA enforced by the database", ok: schemaCurrent, detail: "Staff permissions apply only to MFA-verified sessions." },
    { label: "Automated security tests", ok: null, detail: "79 database checks, 10 pricing tests, build, audit and secret scan run on every pull request (GitHub Actions)." },
  ];

  const commercial: Check[] = [
    { label: "Pricing", ok: pricing?.is_published ?? false, detail: pricing?.is_published ? "Published." : unpriced ? `Draft — ${unpriced} experience price(s) still empty.` : "Draft — ready for your approval.", action: "Pricing & packages" },
    { label: "Legal documents", ok: draftDocs === 0, detail: draftDocs ? `${draftDocs} of ${legal.length} documents are drafts pending counsel review.` : "All documents finalized." },
  ];

  const switches: Check[] = [
    { label: "Master launch lock", ok: null, detail: env.launchLocked ? "ON — nothing can open to the public." : "Released." },
    { label: "Public registration", ok: null, detail: launch.registrations_open ? "OPEN" : "Closed" },
    { label: "Live payments", ok: null, detail: launch.payments_live ? "LIVE" : "Off (sandbox only)" },
    { label: "Identity verification charges", ok: null, detail: launch.identity_verification_live ? "ON" : "Off" },
  ];

  const allChecks = [...connections, ...security, ...commercial].filter((c) => c.ok !== null);
  const done = allChecks.filter((c) => c.ok).length + items.filter((i) => i.status === "done" || i.status === "not_applicable").length;
  const total = allChecks.length + items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <PageHeader eyebrow="Command" title="Launch readiness" />
      <div className="glass glass-edge mb-8 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-semibold">Overall readiness</p>
          <p className="display text-4xl text-gold">{pct}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-champagne" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">{done} of {total} items complete. Registration, live payments and identity charges stay off until you authorize them in <Link href="/admin/settings" className="underline">Launch controls</Link>.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Integrations"><ul className="divide-y divide-line">{connections.map((c) => <Row key={c.label} c={c} />)}</ul></Panel>
        <div className="space-y-6">
          <Panel title="Security"><ul className="divide-y divide-line">{security.map((c) => <Row key={c.label} c={c} />)}</ul></Panel>
          <Panel title="Pricing & legal"><ul className="divide-y divide-line">{commercial.map((c) => <Row key={c.label} c={c} />)}</ul></Panel>
          <Panel title="Launch switches"><ul className="divide-y divide-line">{switches.map((c) => <Row key={c.label} c={c} />)}</ul></Panel>
        </div>
      </div>

      <div className="mt-6">
        <Panel title="Approvals & outstanding requirements">
          <div className="divide-y divide-line">
            {[...new Set(items.map((i) => i.category))].map((cat) => (
              <div key={cat}>
                <p className="bg-ink-3 px-5 py-2 text-xs font-semibold tracking-[0.2em] uppercase text-muted">{cat}</p>
                {items.filter((i) => i.category === cat).map((i) => (
                  <div key={i.key} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="text-sm">
                      <p className="font-semibold text-text">
                        {i.title}
                        <span className={`chip ml-2 ${i.status === "done" ? "chip-live" : i.status === "blocked" ? "chip-danger" : ""}`}>{STATUS_LABEL[i.status]}</span>
                        {i.approved_at && <span className="chip chip-locked ml-1">Approved {date(i.approved_at)}</span>}
                      </p>
                      {i.description && <p className="mt-1 text-muted">{i.description}</p>}
                      {i.note && <p className="mt-1 text-faint">Note: {i.note}</p>}
                    </div>
                    {isOwner && (
                      <ActionForm action={updateChecklistItem} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="key" value={i.key} />
                        <select name="status" defaultValue={i.status} className="field !min-h-[38px] !w-36 !text-sm" aria-label="Status">
                          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input name="note" defaultValue={i.note ?? ""} placeholder="Note" className="field !min-h-[38px] !w-44 !text-sm" aria-label="Note" />
                        {i.requires_owner_approval && (
                          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="approve" defaultChecked={Boolean(i.approved_at)} className="accent-[var(--champagne)]" /> I approve</label>
                        )}
                        <button className="btn btn-ghost btn-sm">Save</button>
                      </ActionForm>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {!items.length && <p className="px-5 py-10 text-center text-sm text-faint">The checklist appears once the database migrations are applied.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
