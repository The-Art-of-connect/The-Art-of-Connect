import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { saveLiveSettings } from "@/app/actions/live-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Q&A" };
const label = "mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";

/** Owner Portal: Live Q&A in The Becoming Circle (directive 43). Changes apply without a deployment. */
export default async function LiveQaAdmin() {
  await requireStaff(["owner", "admin", "moderator"]);
  const db = (await createClient())!;
  const admin = createAdminClient() ?? db;
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ data: s }, { data: sessions }, { data: staff }] = await Promise.all([
    db.from("circle_live_settings").select("*").eq("id", true).maybeSingle(),
    admin.from("circle_live_sessions").select("id, status, starts_at, ends_at, topic_id, circle_topics(title)").gte("starts_at", since).order("starts_at", { ascending: false }).limit(40),
    admin.from("staff_roles").select("user_id, role, profiles(display_name)").in("role", ["owner", "admin", "moderator"]),
  ]);
  const ids = (sessions ?? []).map((x) => x.id);
  const [{ data: att }, { data: reports }] = ids.length ? await Promise.all([
    admin.from("circle_live_attendance").select("session_id, mode").in("session_id", ids),
    admin.from("circle_reports").select("topic_id").in("topic_id", (sessions ?? []).map((x) => x.topic_id)),
  ]) : [{ data: [] }, { data: [] }];
  const count = (sid: string, mode?: string) => (att ?? []).filter((a) => a.session_id === sid && (!mode || a.mode === mode)).length;
  return (
    <>
      <PageHeader eyebrow="The Becoming Circle" title="Live Q&A"><p className="max-w-2xl text-sm text-muted">Each session is a Becoming Circle topic with its own discussion, moderation and reporting. Members get one invitation per session (a pop-up while online, and in their Message Center). Joining a new session never disconnects anyone from another.</p></PageHeader>
      <div className="space-y-6">
        <Panel title="Schedule and invitations">
          <ActionForm action={saveLiveSettings} className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <label className="block"><span className={label}>Daily start times (up to six)</span><input name="start_times" defaultValue={(s?.start_times ?? ["10:00", "19:00"]).join(", ")} className="field w-full" /></label>
            <label className="block"><span className={label}>Time zone</span><input name="timezone" defaultValue={s?.timezone ?? "America/New_York"} className="field w-full" /></label>
            <label className="block"><span className={label}>Session length (minutes)</span><input name="duration_minutes" type="number" min={15} max={240} defaultValue={s?.duration_minutes ?? 60} className="field w-full" /></label>
            <label className="block"><span className={label}>Who is invited</span><select name="eligibility" defaultValue={s?.eligibility ?? "all_members"} className="field w-full"><option value="all_members">Every member (The Becoming Circle is open to all)</option><option value="paid_members">Paid members only</option></select></label>
            <label className="block"><span className={label}>Default host</span><select name="default_host" defaultValue={s?.default_host ?? ""} className="field w-full"><option value="">Assign later</option>{(staff ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{(m.profiles as { display_name?: string } | null)?.display_name ?? "Team member"} ({m.role})</option>)}</select></label>
            <div className="space-y-2"><span className={label}>Switches</span>
              <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={s?.enabled ?? true} /> Live Q&amp;A sessions on</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="popup_invitations" defaultChecked={s?.popup_invitations ?? true} /> Pop-up invitations for online members</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="message_center_invitations" defaultChecked={s?.message_center_invitations ?? true} /> Message Center invitations</label>
            </div>
            <p className="text-xs text-muted sm:col-span-2">Topics are drawn from your approved Becoming Circle topics, never repeating within two days. Members can turn pop-ups off in their Message Center.</p>
            <button className="btn btn-gold btn-sm sm:col-span-2 sm:w-fit">Save schedule</button>
          </ActionForm>
        </Panel>
        <Panel title="Operating costs">
          <div className="space-y-1 p-5 text-sm"><p><span className="font-semibold">Written Live Q&amp;A, invitations and Message Center:</span> $0 (existing infrastructure).</p><p><span className="font-semibold">Live audio and the persistent audio player:</span> off. They need a paid streaming provider, which you have not approved; nothing is activated or charged.</p></div>
        </Panel>
        <Panel title="Sessions (last seven days and upcoming)">
          {(sessions ?? []).length === 0 ? <p className="p-5 text-sm text-muted">No sessions yet. They are created within 15 minutes from the schedule above.</p> : (
            <ul className="divide-y divide-line text-sm">{(sessions ?? []).map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
                <span><span className="font-semibold">{(x.circle_topics as { title?: string } | null)?.title ?? "Live Q&A"}</span><span className="block text-xs text-muted">{new Date(x.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · {x.status}</span></span>
                <span className="text-xs text-muted">{count(x.id)} joined ({count(x.id, "listen")} listening) · {(reports ?? []).filter((r) => r.topic_id === x.topic_id).length} reports · <a href={`/app/circle/${x.topic_id}`} className="text-gold underline">Open</a></span>
              </li>
            ))}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}
