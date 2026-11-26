import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { saveTrackerItem } from "@/app/actions/journey-admin";

export const metadata = { title: "Development tracker" };
export const dynamic = "force-dynamic";

const STAGES = [
  ["designed", "Designed"], ["built", "Built"], ["tests_passed", "Tests passed"], ["merged", "Merged"],
  ["deployed", "Deployed"], ["operational", "Operational"], ["owner_tested", "Owner tested"], ["owner_approved", "Owner approved"],
] as const;
const AWAITING: Record<string, string> = {
  owner: "Waiting on you", legal: "Awaiting legal approval", professional: "Awaiting professional review", openai: "Awaiting OpenAI setup",
  payments: "Awaiting live payments", launch: "Awaiting launch switch", founder_content: "Awaiting founder content",
};

export default async function Development({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const viewer = await requireStaff(rolesFor("/admin/development"));
  const owner = viewer.roles.includes("owner");
  const sp = await searchParams;
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Platform" title="Development tracker" /><NotConnected /></>;
  const { data } = await supabase.from("dev_tracker").select("*").order("sort_order");
  const all = data ?? [];
  const filter = STAGES.find(([k]) => k === sp.stage)?.[0];
  const items = filter ? all.filter((i) => !i[filter]) : all;
  const count = (k: string) => all.filter((i) => i[k]).length;

  return (
    <>
      <PageHeader eyebrow="Platform" title="Development tracker" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">The honest status of every feature, stage by stage. A feature is never &ldquo;operational&rdquo; just because tests pass; the database requires it to be built, tested, merged and deployed first. Only you can record owner testing and approval.</p>
      <div className="mb-8 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {STAGES.map(([k, label]) => (
          <a key={k} href={filter === k ? "/admin/development" : `/admin/development?stage=${k}`} className={`glass p-3 text-center ${filter === k ? "ring-2 ring-gold" : ""}`}>
            <p className="display text-2xl">{count(k)}<span className="text-sm text-muted">/{all.length}</span></p>
            <p className="text-xs text-muted">{label}</p>
          </a>
        ))}
      </div>
      {filter && <p className="mb-4 text-sm text-muted">Showing features <strong>not yet</strong> {STAGES.find(([k]) => k === filter)?.[1].toLowerCase()}. <a href="/admin/development" className="text-gold">Show all</a></p>}
      {!all.length && <NotConnected />}
      <div className="space-y-3">
        {items.map((i) => (
          <ActionForm key={i.key} action={saveTrackerItem} className="glass space-y-3 p-5">
            <input type="hidden" name="key" value={i.key} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{i.area}</p>
                <p className="mt-1 font-semibold">{i.title}</p>
                {i.detail && <p className="mt-1 text-sm text-muted">{i.detail}</p>}
              </div>
              {i.awaiting && <span className="chip chip-locked">{AWAITING[i.awaiting] ?? i.awaiting}</span>}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {STAGES.map(([k, label]) => (
                <li key={k} className={`rounded-full border px-2.5 py-1 text-[0.7rem] ${i[k] ? "border-success/50 bg-success/10 text-success" : "border-line text-faint"}`}>{i[k] ? "✓" : "○"} {label}</li>
              ))}
            </ul>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="text-xs text-faint">Next step
                <textarea name="next_step" defaultValue={i.next_step ?? ""} rows={2} className="field mt-1 w-full" />
              </label>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {owner && <label className="flex items-center gap-2"><input type="checkbox" name="owner_tested" defaultChecked={i.owner_tested} /> I tested this</label>}
                {owner && <label className="flex items-center gap-2"><input type="checkbox" name="owner_approved" defaultChecked={i.owner_approved} /> I approve this</label>}
                <button className="btn btn-ghost btn-sm">Save</button>
              </div>
            </div>
            <p className="text-xs text-faint">Updated {date(i.updated_at)}{i.tested_by_owner_at ? ` · Owner tested ${date(i.tested_by_owner_at)}` : ""}{i.approved_by_owner_at ? ` · Owner approved ${date(i.approved_by_owner_at)}` : ""}</p>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
