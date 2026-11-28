import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMABLE, PROVIDER_LABEL, orderStatus } from "@/lib/formation";
import { MemberForm } from "@/components/MemberForm";
import { startFormationOrder } from "@/app/actions/formation";

export const dynamic = "force-dynamic";
export const metadata = { title: "My formation requests · Business Launch Center" };

type O = { id: string; status: string; requested_at: string | null; provider: string; created_at: string; member_businesses: { name: string; entity_type: string; state: string | null } | null };

/** Start a formation order from the Business Launch Center and follow every request. No payment and no automatic filing. */
export default async function FormationOrders({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const viewer = (await getViewer())!;
  const live = !isInsidePreview(viewer) && !viewer.viewAs;
  const db = await createClient();
  const [{ data: js }, { data: bs }, { data: os }] = db && live
    ? await Promise.all([
        db.from("formation_jurisdictions").select("code, name").order("name"),
        db.from("member_businesses").select("id, name, entity_type, state").eq("user_id", viewer.id).order("created_at"),
        db.from("formation_orders").select("id, status, requested_at, provider, created_at, member_businesses(name, entity_type, state)").eq("user_id", viewer.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const states = js ?? [];
  const businesses = (bs ?? []).filter((b) => b.entity_type in FORMABLE && b.state);
  const orders = (os ?? []) as unknown as O[];
  const pick = ((await searchParams).state ?? "").toUpperCase();

  return (
    <>
      <Link href="/app/launch" className="text-sm font-semibold text-gold">← Business Launch Center</Link>
      <header className="mt-4">
        <p className="eyebrow">Business Launch Center</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">My formation requests</h1>
        <p className="mt-3 max-w-2xl text-muted">Prepare the formation of your LLC, corporation or nonprofit and send it to our team as a request.</p>
      </header>
      <p className="mt-5 max-w-3xl rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm" role="note">
        <span className="font-semibold">This is a request, reviewed before anything is filed or charged.</span> No payment is taken here and nothing is filed automatically. Any government fee or service charge would be shown to you in full, and nothing proceeds without your agreement.
      </p>

      {!live ? <p className="glass mt-8 p-6 text-sm text-muted">Preview only: sign in with your own account to start a formation request.</p> : (
        <>
          <section aria-labelledby="mine" className="mt-8">
            <h2 id="mine" className="display text-2xl">My requests</h2>
            {orders.length ? (
              <ul className="mt-3 space-y-3">{orders.map((o) => {
                const st = orderStatus(o);
                return (
                  <li key={o.id}>
                    <Link href={`/app/launch/orders/${o.id}`} className="glass flex flex-wrap items-center justify-between gap-3 p-5 transition hover:border-[var(--champagne)]">
                      <span>
                        <span className="display block text-xl">{o.member_businesses?.name ?? "My business"}</span>
                        <span className="text-sm text-muted">{FORMABLE[o.member_businesses?.entity_type ?? ""] ?? "Business"}{o.member_businesses?.state ? ` · ${o.member_businesses.state}` : ""} · started {new Date(o.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                      </span>
                      <span className={`chip ${st.tone === "done" ? "chip-live" : st.tone === "closed" ? "chip-locked" : ""}`}>{st.label}</span>
                    </Link>
                  </li>
                );
              })}</ul>
            ) : <p className="glass mt-3 p-5 text-sm text-muted">No formation requests yet. Start one below.</p>}
          </section>

          <section aria-labelledby="start" className="mt-10">
            <h2 id="start" className="display text-2xl">Start a formation request</h2>
            <MemberForm action={startFormationOrder} className="glass mt-3 grid gap-4 p-6 text-sm sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="font-semibold">Business</span>
                <select name="business" defaultValue="new" className="field mt-1">
                  <option value="new">A new business (enter its name below)</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name} · {FORMABLE[b.entity_type]} · {b.state} (from My Businesses)</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2"><span className="font-semibold">Name of the new business</span>
                <input name="name" maxLength={160} placeholder="Leave blank if you chose a business from My Businesses" className="field mt-1" />
              </label>
              <p className="text-xs text-muted sm:col-span-2">For a new business, choose its type and state. A business from My Businesses keeps the type and state saved there.</p>
              <label className="block"><span className="font-semibold">Type of business</span>
                <select name="entity_type" defaultValue="llc" className="field mt-1">{Object.entries(FORMABLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
              <label className="block"><span className="font-semibold">State where it will be formed</span>
                <select name="state" defaultValue={states.some((s) => s.code === pick) ? pick : ""} className="field mt-1">
                  <option value="">Choose a state or D.C.</option>
                  {states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </label>
              <fieldset className="sm:col-span-2"><legend className="font-semibold">How you&apos;d like it filed</legend>
                <div className="mt-2 space-y-2">{Object.entries(PROVIDER_LABEL).map(([k, v], i) => (
                  <label key={k} className="flex items-start gap-2"><input type="radio" name="provider" value={k} defaultChecked={i === 0} className="mt-1" /> {v}</label>
                ))}</div>
              </fieldset>
              <div className="sm:col-span-2"><button className="btn btn-gold">Save and review</button><p className="mt-2 text-xs text-muted">Saved as a draft first. You&apos;ll review it before sending.</p></div>
            </MemberForm>
          </section>
        </>
      )}
    </>
  );
}
