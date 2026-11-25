import Link from "next/link";
import { hasRole, requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formatWhen } from "@/lib/webinars";
import { featureWebinar, reviewWebinar, setComplimentaryAllowance } from "@/app/actions/webinars";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STANDARDS = [
  "Educational and accurate — no misleading financial claims or guaranteed results",
  "No investment solicitations, securities offers or fraudulent opportunities",
  "No unsolicited sales pitches; promotion of the host’s own services stays incidental",
  "Respectful, appropriate content consistent with the Community Standards",
  "Images and materials owned by or licensed to the host",
  "Recording only with attendee consent; recordings published only after review",
];

/** Webinar Management Center. */
export default async function WebinarManagement() {
  const viewer = await requireStaff(rolesFor("/admin/webinars"));
  const isOwner = hasRole(viewer, ["owner"]);
  const canMetrics = hasRole(viewer, ["owner", "executive"]);
  const supabase = (await createClient())!;
  const b = supabase.schema("business");
  const [{ data: queue }, { data: all }, metricsRes, { data: allowance }, { data: interest }] = await Promise.all([
    b.from("webinars").select("*").in("status", ["submitted"]).order("created_at"),
    b.from("webinars").select("id, title, host_display_name, status, starts_at, time_zone, is_featured").not("status", "in", "(draft)").order("starts_at", { ascending: false }).limit(100),
    canMetrics ? b.rpc("knowledge_exchange_metrics") : Promise.resolve({ data: null }),
    b.rpc("complimentary_allowance"),
    canMetrics ? b.from("webinar_host_interest").select("topics, created_at").order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] as { topics: string | null; created_at: string }[] }),
  ]);
  const m = (metricsRes.data ?? {}) as Record<string, number | Record<string, number>>;
  const n = (k: string) => (typeof m[k] === "number" ? (m[k] as number) : 0);

  return (
    <>
      <PageHeader eyebrow="Growth" title="The Knowledge Exchange" />
      {canMetrics && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Awaiting review" value={n("pending_review")} accent="var(--gold-bright)" />
          <Stat label="Upcoming webinars" value={n("upcoming")} hint={`${n("completed")} completed`} />
          <Stat label="Registrations · Attendance" value={`${n("registrations")} · ${n("attendance")}`} hint={m.average_rating ? `Average rating ${m.average_rating}` : undefined} />
          <Stat label="Free members at allowance" value={n("free_members_at_allowance")} hint={`${n("host_interest")} members want to host`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={`Review queue — ${queue?.length ?? 0}`}>
          {queue?.length ? (
            <ul className="divide-y divide-line">
              {queue.map((w) => {
                const { date, time } = formatWhen(w.starts_at, w.time_zone);
                return (
                  <li key={w.id} className="px-5 py-5 text-sm">
                    <p className="display text-2xl">{w.title}</p>
                    <p className="text-xs text-muted">{w.host_display_name} · {date} · {time} · {w.duration_minutes} min</p>
                    <p className="mt-3 whitespace-pre-line">{w.description}</p>
                    {w.learning_objectives?.length > 0 && <p className="mt-2 text-muted">Objectives: {w.learning_objectives.join(" · ")}</p>}
                    {w.host_bio && <p className="mt-2 text-muted">Bio: {w.host_bio}</p>}
                    <ActionForm action={reviewWebinar} className="mt-4 space-y-2">
                      <input type="hidden" name="id" value={w.id} />
                      <textarea name="note" placeholder="Note to the host (required when requesting changes or declining)" className="field !min-h-[60px]" />
                      <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="policy" className="mt-0.5 accent-[var(--champagne)]" /> This webinar meets the Knowledge Exchange standards.</label>
                      <div className="flex flex-wrap gap-2">
                        <button name="decision" value="approved" className="btn btn-gold btn-sm">Approve & publish</button>
                        <button name="decision" value="changes_requested" className="btn btn-ghost btn-sm">Request changes</button>
                        <button name="decision" value="rejected" className="btn btn-ghost btn-sm">Decline</button>
                      </div>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No webinars waiting for review.</Empty>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Content standards">
            <ul className="space-y-2 p-5 text-sm">{STANDARDS.map((s) => <li key={s} className="flex gap-2"><span className="text-gold">✓</span>{s}</li>)}</ul>
          </Panel>
          <Panel title="Complimentary webinars for free members">
            {isOwner ? (
              <ActionForm action={setComplimentaryAllowance} className="flex items-end gap-3 p-5">
                <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Webinars before membership is required</span><input name="allowance" type="number" min={0} max={50} defaultValue={Number(allowance ?? 3)} className="field !w-28" /></label>
                <button className="btn btn-gold btn-sm">Save</button>
              </ActionForm>
            ) : (
              <p className="p-5 text-sm">{Number(allowance ?? 3)} complimentary webinars.</p>
            )}
            <p className="px-5 pb-5 text-xs text-muted">Counts distinct webinars actually joined. Browsing, registering, canceled events and re-joining don’t count. No one is charged or upgraded automatically.</p>
          </Panel>
          {canMetrics && (
            <Panel title="Interest in hosting">
              {interest?.length ? (
                <ul className="divide-y divide-line text-sm">{interest.map((i, k) => <li key={k} className="px-5 py-2.5">{i.topics || "—"} <span className="text-xs text-faint">· {new Date(i.created_at).toLocaleDateString("en-US")}</span></li>)}</ul>
              ) : (
                <Empty>No members have registered interest yet.</Empty>
              )}
            </Panel>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Panel title="All webinars">
          {all?.length ? (
            <table className="data-table">
              <thead><tr><th>Webinar</th><th>Host</th><th>When</th><th>Status</th><th>Featured</th></tr></thead>
              <tbody>
                {all.map((w) => {
                  const { date } = formatWhen(w.starts_at, w.time_zone);
                  return (
                    <tr key={w.id}>
                      <td>{w.status === "approved" ? <Link href={`/webinars/${w.id}`} className="text-gold underline">{w.title}</Link> : w.title}</td>
                      <td>{w.host_display_name}</td>
                      <td>{date}</td>
                      <td className="capitalize">{w.status.replace("_", " ")}</td>
                      <td>
                        {isOwner && w.status === "approved" ? (
                          <ActionForm action={featureWebinar}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="on" value={w.is_featured ? "0" : "1"} /><button className="text-xs text-gold underline">{w.is_featured ? "★ Featured" : "Feature"}</button></ActionForm>
                        ) : w.is_featured ? "★" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty>No webinars yet. Hosting opens when you set “Host your own webinar” to available in the Business Growth Center.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
