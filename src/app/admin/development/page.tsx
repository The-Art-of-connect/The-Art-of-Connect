import { requireStaff } from "@/lib/auth";
import { date, rolesFor } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/admin/ActionForm";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { saveTrackerItem } from "@/app/actions/journey-admin";
import { STATUS } from "@/lib/dev-tracker";

export const metadata = { title: "Development tracker" };

export default async function Development() {
  await requireStaff(rolesFor("/admin/development"));
  const supabase = await createClient();
  if (!supabase) return <><PageHeader eyebrow="Platform" title="Development tracker" /><NotConnected /></>;
  const { data } = await supabase.from("dev_tracker").select("*").order("sort_order");
  const items = data ?? [];
  const counts = Object.keys(STATUS).map((k) => [k, items.filter((i) => i.status === k).length] as const).filter(([, n]) => n > 0);
  return (
    <>
      <PageHeader eyebrow="Platform" title="Development tracker" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">The honest status of every feature. A page being designed does not make a feature complete — each item says exactly what it is waiting for.</p>
      <div className="mb-8 flex flex-wrap gap-2">
        {counts.map(([k, n]) => <span key={k} className={`chip ${STATUS[k].tone}`} title={STATUS[k].hint}>{STATUS[k].label}: {n}</span>)}
      </div>
      {!items.length && <NotConnected />}
      <div className="space-y-3">
        {items.map((i) => (
          <ActionForm key={i.key} action={saveTrackerItem} className="glass grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-start">
            <input type="hidden" name="key" value={i.key} />
            <div>
              <p className="text-xs tracking-[0.2em] text-gold-deep uppercase">{i.area}</p>
              <p className="mt-1 font-semibold">{i.title}</p>
              {i.detail && <p className="mt-1 text-sm text-muted">{i.detail}</p>}
              <p className="mt-1 text-xs text-faint">Updated {date(i.updated_at)}</p>
            </div>
            <label className="text-xs text-faint">Status
              <select name="status" defaultValue={i.status} className="field mt-1 w-full">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-faint">Next step
              <textarea name="next_step" defaultValue={i.next_step ?? ""} rows={2} className="field mt-1 w-full" />
            </label>
            <button className="btn btn-ghost btn-sm self-end">Save</button>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
