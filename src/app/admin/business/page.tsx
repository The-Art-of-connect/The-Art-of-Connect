import { hasRole, requireStaff } from "@/lib/auth";
import { rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { FEATURE_STATUS, HELP_NEEDED, HELP_OFFERED, US_STATES } from "@/lib/business-options";
import { resolveBusinessReport, saveFeature, saveReadinessItem, saveReference, saveResource } from "@/app/actions/business-admin";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Metrics = Record<string, number | Record<string, number>>;
const top = (m: Record<string, number> | undefined, labels: Record<string, string> = {}, n = 8) =>
  Object.entries(m ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [labels[k] ?? k, v] as const);

function Bars({ rows, empty }: { rows: readonly (readonly [string, number])[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="px-5 py-6 text-sm text-faint">{empty}</p>;
  return (
    <ul className="space-y-2 p-5 text-sm">
      {rows.map(([label, v]) => (
        <li key={label} className="grid grid-cols-[1fr_3rem] items-center gap-3">
          <span>
            <span className="block">{label}</span>
            <span className="mt-1 block h-1.5 rounded-full bg-champagne/70" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-muted">{v}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Founding Community & Business Growth Center. Aggregates only: no member
 * names, conversations, assessment answers or financial details.
 */
export default async function BusinessGrowthCenter() {
  const viewer = await requireStaff(rolesFor("/admin/business"));
  const isOwner = hasRole(viewer, ["owner"]);
  const canMetrics = hasRole(viewer, ["owner", "executive"]);
  const supabase = (await createClient())!;
  const b = supabase.schema("business");
  const [metricsRes, { data: features }, { data: industries }, { data: categories }, { data: readiness }, { data: resources }, { data: reports }] = await Promise.all([
    canMetrics ? b.rpc("community_metrics") : Promise.resolve({ data: null, error: null }),
    b.from("features").select("*").order("sort_order"),
    b.from("industries").select("*").order("sort_order"),
    b.from("categories").select("*").order("sort_order"),
    b.from("readiness_items").select("*").order("sort_order"),
    b.from("resources").select("*").order("created_at", { ascending: false }),
    b.from("reports").select("id, reason, details, status, post_id, conversation_id, created_at").in("status", ["open", "reviewing"]).order("created_at", { ascending: false }),
  ]);
  const m = (metricsRes.data ?? {}) as Metrics;
  const num = (k: string) => (typeof m[k] === "number" ? (m[k] as number) : 0);
  const map = (k: string) => (m[k] && typeof m[k] === "object" ? (m[k] as Record<string, number>) : {});
  const indName = Object.fromEntries((industries ?? []).map((i) => [i.slug, i.name]));
  const catName = Object.fromEntries((categories ?? []).map((c) => [c.slug, c.name]));
  const featName = Object.fromEntries((features ?? []).map((f) => [f.key, f.name]));
  const needed = map("help_needed");
  const offered = map("help_offered");
  const gaps = Object.keys(HELP_NEEDED).map((k) => [HELP_NEEDED[k], (needed[k] ?? 0) - (offered[k] ?? 0)] as const).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader eyebrow="Growth" title="Founding Community & Business Growth" />
      <p className="mb-8 max-w-3xl text-sm text-muted">
        Build the community first. Deliver genuine value. Monetize responsibly. Everything here is aggregated — member conversations,
        assessment answers and financial details are never shown.
      </p>

      {canMetrics && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Business owners onboarded" value={num("business_owners")} />
            <Stat label="Free accounts · Members" value={`${num("free_accounts")} · ${num("premium_members")}`} />
            <Stat label="Mentors available" value={num("mentors_available")} hint={`${num("mentorship_seekers")} seeking mentorship`} accent="var(--gold-bright)" />
            <Stat label="Potential complementary connections" value={num("complementary_pairs")} hint="One owner’s need matches another’s offer" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Open board posts" value={num("open_posts")} />
            <Stat label="Connection requests" value={num("requests")} hint={`${num("accepted")} accepted`} />
            <Stat label="Successful connections" value={num("successful_connections")} accent="var(--success)" hint={`${num("acknowledgements")} acknowledgements`} />
            <Stat label="Open reports" value={num("open_reports")} accent="var(--danger)" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Panel title="Business needs"><Bars rows={top(needed, HELP_NEEDED)} empty="No responses yet." /></Panel>
            <Panel title="Available member expertise"><Bars rows={top(offered, HELP_OFFERED)} empty="No responses yet." /></Panel>
            <Panel title="Resource gaps (needed more than offered)"><Bars rows={gaps.slice(0, 8)} empty="No gaps yet." /></Panel>
            <Panel title="Industries represented"><Bars rows={top(map("industries"), indName)} empty="No business owners yet." /></Panel>
            <Panel title="Where owners are"><Bars rows={top(map("states"), US_STATES)} empty="No business owners yet." /></Panel>
            <Panel title="Interest in upcoming features"><Bars rows={top(map("feature_interest"), featName)} empty="No requests yet." /></Panel>
            <Panel title="Board posts by category"><Bars rows={top(map("posts_by_category"), catName)} empty="No posts yet." /></Panel>
          </div>
          <div className="mt-6 rounded-2xl border border-champagne/50 bg-champagne/10 p-5 text-sm">
            <p className="font-semibold">Readiness to activate premium membership</p>
            <p className="mt-1 text-muted">
              {num("business_owners")} owners onboarded, {num("mentors_available")} mentors, {num("complementary_pairs")} potential complementary connections,
              {" "}{(resources ?? []).filter((r) => r.status === "published").length} published resources. Premium membership stays inactive until you decide the
              community offers enough value — the decision is recorded in Launch Readiness.
            </p>
          </div>
        </>
      )}

      <div className="mt-8 space-y-6">
        <Panel title="Feature availability">
          <p className="border-b border-line px-5 py-3 text-xs text-muted">Choose each feature’s status and who it’s for. Members see these labels; nothing unavailable is presented as working. {isOwner ? "" : "Only the owner can change features."}</p>
          <ul className="divide-y divide-line">
            {(features ?? []).map((f) => (
              <li key={f.key} className="px-5 py-4">
                <ActionForm action={saveFeature} className="grid gap-3 lg:grid-cols-[1.4fr_12rem_auto_14rem_auto] lg:items-end">
                  <input type="hidden" name="key" value={f.key} />
                  <div>
                    <input name="name" defaultValue={f.name} readOnly={!isOwner} className="field !font-semibold" aria-label="Feature name" />
                    <input name="description" defaultValue={f.description} readOnly={!isOwner} className="field mt-2 !text-xs" aria-label="Description" />
                  </div>
                  <select name="status" defaultValue={f.status} disabled={!isOwner} className="field" aria-label="Status">
                    {Object.entries(FEATURE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                  </select>
                  <fieldset className="flex gap-3 text-xs" disabled={!isOwner}>
                    {(["guest", "free", "premium"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1 capitalize"><input type="checkbox" name={t} defaultChecked={f[t]} className="accent-[var(--champagne)]" />{t}</label>
                    ))}
                  </fieldset>
                  <div className="grid grid-cols-2 gap-2">
                    <select name="scheduledStatus" defaultValue={f.scheduled_status ?? ""} disabled={!isOwner} className="field !text-xs" aria-label="Scheduled status">
                      <option value="">No schedule</option>
                      {Object.entries(FEATURE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                    </select>
                    <input name="scheduledAt" type="datetime-local" defaultValue={f.scheduled_at ? f.scheduled_at.slice(0, 16) : ""} disabled={!isOwner} className="field !text-xs" aria-label="Scheduled time" />
                  </div>
                  {isOwner && <button className="btn btn-ghost btn-sm">Save</button>}
                </ActionForm>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Reports — ${reports?.length ?? 0} open`}>
          {reports?.length ? (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="px-5 py-4 text-sm">
                  <p className="font-semibold capitalize">{r.reason} <span className="font-normal text-muted">· {new Date(r.created_at).toLocaleString("en-US")} · {r.post_id ? "Board post" : r.conversation_id ? "Private conversation" : "Member"}</span></p>
                  {r.details && <p className="mt-1 text-muted">{r.details}</p>}
                  <ActionForm action={resolveBusinessReport} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    {r.post_id && <input type="hidden" name="postId" value={r.post_id} />}
                    <select name="status" className="field !w-40" aria-label="Outcome"><option value="reviewing">Reviewing</option><option value="actioned">Actioned</option><option value="dismissed">Dismissed</option></select>
                    {r.post_id && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="removePost" className="accent-[var(--champagne)]" /> Remove the post</label>}
                    <button className="btn btn-ghost btn-sm">Save</button>
                  </ActionForm>
                  {r.conversation_id && <p className="mt-2 text-xs text-faint">Conversations stay private. If a report requires reading it, the owner can open it through the recorded safety-access process.</p>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No open reports.</Empty>
          )}
        </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Industries">
            <ActionForm action={saveReference} className="flex gap-2 border-b border-line p-5">
              <input type="hidden" name="table" value="industries" />
              <input name="name" placeholder="Add an industry" className="field" aria-label="Industry name" />
              <button className="btn btn-gold btn-sm shrink-0">Add</button>
            </ActionForm>
            <p className="px-5 py-4 text-sm text-muted">{(industries ?? []).filter((i) => i.is_active).map((i) => i.name).join(" · ")}</p>
          </Panel>
          <Panel title="Connection Board categories">
            <ActionForm action={saveReference} className="grid gap-2 border-b border-line p-5 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="table" value="categories" />
              <input name="name" placeholder="Category name" className="field" aria-label="Category name" />
              <input name="description" placeholder="Short description" className="field" aria-label="Description" />
              <button className="btn btn-gold btn-sm">Add</button>
            </ActionForm>
            <p className="px-5 py-4 text-sm text-muted">{(categories ?? []).filter((c) => c.is_active).map((c) => c.name).join(" · ")}</p>
          </Panel>
          <Panel title="Business readiness checklist">
            <ActionForm action={saveReadinessItem} className="grid gap-2 border-b border-line p-5 sm:grid-cols-[1fr_8rem_auto]">
              <input name="title" placeholder="New checklist item" className="field" aria-label="Title" />
              <input name="area" placeholder="Area" className="field" aria-label="Area" />
              <button className="btn btn-gold btn-sm">Add</button>
            </ActionForm>
            <ul className="divide-y divide-line text-sm">{(readiness ?? []).map((r) => <li key={r.key} className="px-5 py-2.5">{r.title} <span className="text-xs text-muted">· {r.area}</span></li>)}</ul>
          </Panel>
          <Panel title="Educational resources">
            <ActionForm action={saveResource} className="grid gap-2 border-b border-line p-5 sm:grid-cols-2">
              <input name="title" placeholder="Title" className="field" aria-label="Title" />
              <input name="url" placeholder="https:// link (optional)" className="field" aria-label="Link" />
              <input name="summary" placeholder="Summary" className="field sm:col-span-2" aria-label="Summary" />
              <select name="tier" className="field" aria-label="Who can see it"><option value="free">Free accounts & members</option><option value="guest">Public (Explore page)</option><option value="premium">Members only</option></select>
              <select name="status" className="field" aria-label="Status"><option value="draft">Draft</option><option value="published">Published</option></select>
              <button className="btn btn-gold btn-sm sm:col-span-2">Add resource</button>
            </ActionForm>
            {resources?.length ? (
              <ul className="divide-y divide-line text-sm">{resources.map((r) => <li key={r.id} className="px-5 py-2.5">{r.title} <span className="text-xs text-muted">· {r.tier} · {r.status}</span></li>)}</ul>
            ) : (
              <Empty>No resources yet. Add only resources your team has reviewed.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
