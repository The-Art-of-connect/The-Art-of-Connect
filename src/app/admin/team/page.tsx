import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteTeamMember, updateTeamMember } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/** What each delegated permission opens (matches the Owner Portal sections; enforced on the server and by database policies). */
const ROLES = [
  { key: "executive", name: "Executive management", can: "Business performance (memberships, payments, financial reports — view only), members, professional applications, marketing, support, moderation, trust & safety, launch readiness. Cannot change pricing, issue refunds, publish or launch." },
  { key: "admin", name: "Administrator", can: "General staff: members, professional applications, access & referrals, marketing (no promotions), support, moderation, trust & safety, Security Center, analytics. No confidential financial information." },
  { key: "finance", name: "Finance", can: "Prepares pricing changes and promotions, manages authorized financial operations and reports, views the financial audit trail. Cannot publish pricing, issue refunds or launch." },
  { key: "support", name: "Member support", can: "Member lookup and customer support." },
  { key: "moderator", name: "Moderator", can: "Content moderation and trust & safety." },
] as const;

const when = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "Never");

export default async function TeamPage() {
  const viewer = await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const { data } = await supabase.rpc("staff_security_status");
  const team = (data ?? []) as { user_id: string; email: string; roles: string; mfa_factors: number; last_sign_in: string | null }[];

  return (
    <>
      <PageHeader eyebrow="Platform" title="Team & permissions" />
      <p className="mb-8 max-w-3xl text-muted">
        Give each person only the access their work requires. Every team member sets their own password and must use two-step verification.
        Permissions are enforced on the server and by the database, not just hidden in the menu. Private journals, assessments and
        confidential communications are not visible to any role, including the owner.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Your team">
          {team.length ? (
            <ul className="divide-y divide-line">
              {team.map((m) => {
                const roles = m.roles.split(", ");
                return (
                  <li key={m.user_id} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {m.email}
                        {m.user_id === viewer.id && <span className="ml-2 text-xs text-gold">You</span>}
                      </p>
                      <p className={`text-xs ${m.mfa_factors ? "text-success" : "text-danger"}`}>
                        {m.mfa_factors ? "Two-step verification on" : "Two-step verification not set up"} · last sign-in {when(m.last_sign_in)}
                      </p>
                    </div>
                    {roles.includes("owner") ? (
                      <p className="mt-1 text-sm text-muted">Owner — full control of the company.</p>
                    ) : (
                      <ActionForm action={updateTeamMember} className="mt-3">
                        <input type="hidden" name="userId" value={m.user_id} />
                        <div className="flex flex-wrap gap-2">
                          {ROLES.map((r) => (
                            <label key={r.key} className="chip min-h-10 cursor-pointer normal-case tracking-normal has-[:checked]:border-champagne has-[:checked]:bg-champagne/15">
                              <input type="checkbox" name="roles" value={r.key} defaultChecked={roles.includes(r.key)} className="sr-only" />
                              {r.name}
                            </label>
                          ))}
                        </div>
                        <button className="btn btn-ghost mt-3 !py-2 text-xs">Save permissions</button>
                        <p className="mt-1 text-xs text-faint">Clear every permission and save to remove this person; they are signed out of all devices.</p>
                      </ActionForm>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No team members yet.</Empty>
          )}
        </Panel>

        <Panel title="Invite a team member">
          <ActionForm action={inviteTeamMember} className="space-y-4 p-5">
            <input name="email" type="email" required placeholder="name@theartofconnect.com" className="field" aria-label="Email" />
            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm text-muted">Permissions</legend>
              {ROLES.map((r) => (
                <label key={r.key} className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name="roles" value={r.key} className="mt-1 accent-[var(--champagne)]" />
                  <span>
                    <span className="font-semibold">{r.name}</span>
                    <span className="block text-muted">{r.can}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button className="btn btn-gold w-full">Send invitation</button>
            <p className="text-xs text-faint">Before launch, invitation emails are delivered only to @theartofconnect.com addresses.</p>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
