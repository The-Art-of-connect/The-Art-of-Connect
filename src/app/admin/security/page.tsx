import { requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { env, isSupabaseConfigured, serverConfig, serverSecret } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email";
import { turnstileStatus } from "@/lib/turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/turnstile-core";
import { createClient } from "@/lib/supabase/server";
import { revokeMemberSessions, updateSecurityAlert } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const when = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—";

const EVENT: Record<string, string> = {
  login_succeeded: "Signed in",
  login_failed: "Failed sign-in",
  mfa_failed: "Failed two-step code",
  password_reset_requested: "Password reset requested",
  password_changed: "Password changed",
  signup_attempt: "Sign-up attempt",
  signup_blocked: "Sign-up blocked",
  bot_check_failed: "Bot check refused",
  rate_limited: "Rate limit reached",
  session_revoked: "Session signed out",
  sessions_revoked_all: "Signed out of all devices",
};
const FORM: Record<string, string> = {
  sign_in: "Sign in",
  sign_up: "Registration",
  password_reset: "Password recovery",
  waitlist: "Notify-me / waitlist",
  pro_interest: "Professional interest",
  pro_application: "Professional application",
};
const REASON: Record<string, string> = {
  missing: "No verification",
  malformed: "Malformed token",
  invalid: "Invalid token",
  expired_or_reused: "Expired or reused token",
  rejected: "Rejected by Cloudflare",
  action_mismatch: "Token from another form",
  hostname_mismatch: "Token from another website",
  unavailable: "Cloudflare unreachable (refused)",
  not_configured: "Secret key missing (refused)",
};

/** Only safe, non-sensitive detail keys are ever displayed. */
const showDetails = (d: Record<string, unknown> | null) =>
  Object.entries(d ?? {})
    .filter(([k]) => ["form", "reason", "codes", "hostname", "count", "by_staff"].includes(k))
    .map(([k, v]) => (k === "form" ? FORM[String(v)] ?? String(v) : k === "reason" ? REASON[String(v)] ?? String(v) : `${k}: ${v}`))
    .join(" · ");

export default async function SecurityCenterPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  await requireStaff(rolesFor("/admin/security"));
  const supabase = (await createClient())!;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const memberQuery = ((await searchParams).member ?? "").trim().toLowerCase().slice(0, 254);

  const count = async (type: string) =>
    (await supabase.from("security_events").select("*", { count: "exact", head: true }).eq("event_type", type).gte("created_at", since)).count ?? 0;

  const [failed, bots, limited, alerts, events, botEvents, staff] = await Promise.all([
    count("login_failed"),
    count("bot_check_failed"),
    count("rate_limited"),
    supabase.from("security_alerts").select("id, kind, severity, subject, details, status, created_at").in("status", ["open", "acknowledged"]).order("created_at", { ascending: false }).limit(50),
    supabase.from("security_events").select("id, event_type, email, details, created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("security_events").select("details").eq("event_type", "bot_check_failed").gte("created_at", since).limit(1000),
    supabase.rpc("staff_security_status"),
  ]);

  const byForm: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  for (const e of botEvents.data ?? []) {
    const d = (e.details ?? {}) as Record<string, string>;
    byForm[d.form ?? "unknown"] = (byForm[d.form ?? "unknown"] ?? 0) + 1;
    byReason[d.reason ?? "unknown"] = (byReason[d.reason ?? "unknown"] ?? 0) + 1;
  }

  // Session lookup for one member (owner/admin only; coarse location only).
  let member: { id: string; email: string } | null = null;
  let sessions: { id: string; created_at: string; last_active: string; aal: string; user_agent: string | null; approx_ip: string | null }[] = [];
  if (memberQuery) {
    const { data } = await supabase.from("profiles").select("id, email").eq("email", memberQuery).maybeSingle();
    if (data) {
      member = data as { id: string; email: string };
      sessions = ((await supabase.rpc("list_sessions", { target: member.id })).data ?? []) as typeof sessions;
    }
  }

  const ts = turnstileStatus();
  const integrations = [
    { label: "Bot protection (Cloudflare Turnstile)", ok: ts === "active", detail: ts === "active" ? `Active on ${TURNSTILE_ACTIONS.length} public forms; every token is verified on the server (single-use, 5-minute expiry, bound to the form and our domains).` : ts === "misconfigured" ? "Only one of the two keys is set — forms refuse submissions until both are present." : "Not configured." },
    { label: "Rate limiting", ok: isSupabaseConfigured(), detail: "Per visitor and per form, enforced in the database: sign-in 10/15 min · registration 5/hr · password recovery 3/hr · waitlist 5/hr · professional interest 5/hr · applications 3/hr." },
    { label: "Stripe webhook signature", ok: Boolean(serverSecret("STRIPE_WEBHOOK_SECRET")), detail: "Unsigned or forged webhook calls are rejected." },
    { label: "Stripe mode", ok: !serverSecret("STRIPE_SECRET_KEY").startsWith("sk_live_"), detail: serverSecret("STRIPE_SECRET_KEY").startsWith("sk_live_") ? "LIVE key present (blocked until you authorize live payments)." : "Sandbox only." },
    { label: "Email (Resend)", ok: isEmailConfigured(), detail: isEmailConfigured() ? `Sending as ${serverConfig.emailFrom}. ${env.launchLocked ? "Pre-launch: only authorized test recipients receive mail." : ""}` : "Not configured." },
    { label: "Server secret key", ok: Boolean(serverSecret("SUPABASE_SERVICE_ROLE_KEY")), detail: "Kept on the server only; never sent to browsers." },
    { label: "Launch lock", ok: env.launchLocked, detail: env.launchLocked ? "ON — public enrollment and live payments cannot open." : "Released." },
    { label: "Database backups", ok: null as boolean | null, detail: "Daily backups and point-in-time recovery require the Supabase Pro plan (awaiting your approval)." },
  ];

  return (
    <>
      <PageHeader eyebrow="Platform" title="Security Center" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open alerts" value={(alerts.data ?? []).filter((a) => a.status === "open").length} accent="var(--danger)" />
        <Stat label="Failed sign-ins" value={failed} hint="Last 24 hours" />
        <Stat label="Bots refused" value={bots} hint="Last 24 hours" accent="var(--champagne)" />
        <Stat label="Rate-limited" value={limited} hint="Last 24 hours" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Integration security status">
          <ul className="divide-y divide-line">
            {integrations.map((c) => (
              <li key={c.label} className="grid grid-cols-[1.4rem_1fr] gap-3 px-5 py-3">
                <span className={`font-bold ${c.ok === true ? "text-success" : c.ok === false ? "text-danger" : "text-gold"}`} aria-hidden="true">{c.ok === true ? "✓" : c.ok === false ? "✕" : "•"}</span>
                <span><span className="font-semibold">{c.label}</span><span className="block text-sm text-muted">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Bot protection — last 24 hours">
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[0.65rem] tracking-[0.22em] uppercase text-faint">Protected forms</p>
              <ul className="space-y-1 text-sm">
                {TURNSTILE_ACTIONS.map((a) => (
                  <li key={a} className="flex justify-between gap-3"><span>{FORM[a]}</span><span className="text-muted">{byForm[a] ?? 0} refused</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[0.65rem] tracking-[0.22em] uppercase text-faint">Why requests were refused</p>
              {Object.keys(byReason).length ? (
                <ul className="space-y-1 text-sm">
                  {Object.entries(byReason).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                    <li key={r} className="flex justify-between gap-3"><span>{REASON[r] ?? r}</span><span className="text-muted">{n}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">No refusals.</p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Security alerts">
          {alerts.data?.length ? (
            <ul className="divide-y divide-line">
              {alerts.data.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      <span className={a.severity === "high" ? "text-danger" : "text-gold"}>{a.severity.toUpperCase()}</span> · {a.kind.replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-muted">{a.details} — {a.kind === "brute_force_account" ? a.subject : "source (hashed)"} · {when(a.created_at)} · {a.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.status === "open" && (
                      <ActionForm action={updateSecurityAlert}>
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="acknowledged" />
                        <button className="btn btn-ghost !py-2 text-xs">Acknowledge</button>
                      </ActionForm>
                    )}
                    <ActionForm action={updateSecurityAlert}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="resolved" />
                      <button className="btn btn-gold !py-2 text-xs">Resolve</button>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No open alerts. Repeated failed sign-ins and suspicious sign-up patterns raise alerts here automatically.</Empty>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Staff two-step verification">
          {staff.data?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-[0.65rem] tracking-[0.18em] uppercase text-faint"><tr><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Roles</th><th className="px-5 py-3">MFA</th><th className="px-5 py-3">Last sign-in</th></tr></thead>
              <tbody className="divide-y divide-line">
                {(staff.data as { user_id: string; email: string; roles: string; mfa_factors: number; last_sign_in: string | null }[]).map((s) => (
                  <tr key={s.user_id}>
                    <td className="px-5 py-3">{s.email}</td>
                    <td className="px-5 py-3 capitalize">{s.roles}</td>
                    <td className={`px-5 py-3 ${s.mfa_factors ? "text-success" : "text-danger"}`}>{s.mfa_factors ? "Enrolled" : "Not enrolled"}</td>
                    <td className="px-5 py-3 text-muted">{when(s.last_sign_in)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No staff accounts yet.</Empty>
          )}
        </Panel>

        <Panel title="Member sessions">
          <form className="flex gap-2 p-5" method="get">
            <input name="member" type="email" defaultValue={memberQuery} placeholder="Member email" className="field" aria-label="Member email" />
            <button className="btn btn-ghost shrink-0">Look up</button>
          </form>
          {memberQuery && !member && <Empty>No account found for that email.</Empty>}
          {member && (
            <div className="px-5 pb-5">
              {sessions.length ? (
                <>
                  <ul className="divide-y divide-line text-sm">
                    {sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                        <span>
                          <span className="block">{s.user_agent?.slice(0, 70) ?? "Unknown device"}</span>
                          <span className="text-xs text-faint">Started {when(s.created_at)} · active {when(s.last_active)} · {s.approx_ip ?? "—"} · {s.aal === "aal2" ? "two-step verified" : "password only"}</span>
                        </span>
                        <ActionForm action={revokeMemberSessions}>
                          <input type="hidden" name="userId" value={member!.id} /><input type="hidden" name="sessionId" value={s.id} />
                          <button className="btn btn-ghost !py-1.5 text-xs">Sign out</button>
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={revokeMemberSessions} className="mt-4">
                    <input type="hidden" name="userId" value={member.id} /><input type="hidden" name="sessionId" value="" />
                    <button className="btn btn-gold w-full text-xs">Sign {member.email} out of every device</button>
                  </ActionForm>
                </>
              ) : (
                <p className="text-sm text-faint">{member.email} has no active sessions.</p>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Security audit log">
          {events.data?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-[0.65rem] tracking-[0.18em] uppercase text-faint"><tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Details</th></tr></thead>
              <tbody className="divide-y divide-line">
                {events.data.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{when(e.created_at)}</td>
                    <td className={`px-5 py-3 ${["login_failed", "bot_check_failed", "signup_blocked", "mfa_failed"].includes(e.event_type) ? "text-danger" : ""}`}>{EVENT[e.event_type] ?? e.event_type}</td>
                    <td className="px-5 py-3">{e.email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{showDetails(e.details as Record<string, unknown>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No security events yet.</Empty>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-faint">Logs never contain passwords, keys, verification tokens, journals or private messages. Visitor IP addresses are stored only as one-way hashes.</p>
        </Panel>
      </div>
    </>
  );
}
