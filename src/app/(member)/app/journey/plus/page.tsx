import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/admin";
import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { buy, disableAutoReload, enableAutoReload } from "@/app/actions/journey-member";

export const metadata = { title: "Journey Plus" };

export default async function Plus({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const live = Boolean(supabase && !isInsidePreview(viewer));
  const [{ data: packages }, { data: ar }, { data: purchases }] = live
    ? await Promise.all([
        supabase!.from("journey_message_packages").select("slug, messages, price_cents").eq("is_active", true).order("sort_order"),
        supabase!.from("journey_auto_reload").select("enabled, package_slug, monthly_cap_cents, authorized_at").eq("user_id", viewer.id).maybeSingle(),
        supabase!.from("journey_purchases").select("id, kind, quantity, amount_cents, status, auto_reload, created_at").order("created_at", { ascending: false }).limit(10),
      ])
    : [{ data: null }, { data: null }, { data: [] }];
  const published = Boolean(packages?.length);
  const list = packages?.length ? packages : [25, 50, 100, 250].map((n) => ({ slug: `messages-${n}`, messages: n, price_cents: null as number | null }));
  return (
    <>
      <LuxHero eyebrow="Journey" title="Journey Plus" tagline="More conversation, only when you choose.">
        <p className="max-w-2xl text-muted">Your membership includes a generous monthly Journey allowance. If you&rsquo;d like more, add a message or voice package — on your terms.</p>
      </LuxHero>
      {sp.purchase === "success" && <div className="mt-8"><Notice>Thank you. Your messages are added as soon as your payment is confirmed — usually within a minute.</Notice></div>}
      {sp.autoreload === "on" && <div className="mt-8"><Notice>Your card is saved. Auto-Reload turns on as soon as your bank confirms it.</Notice></div>}

      <LuxSection title="Message packages" intro="Used after your monthly allowance. Included monthly messages don't roll over.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <LuxCard key={p.slug} mark={String(p.messages)} title={`${p.messages} messages`} badge={published && p.price_cents ? money(p.price_cents) : "Pricing soon"}>
              {published && (
                <MemberForm action={buy}>
                  <input type="hidden" name="kind" value="messages" /><input type="hidden" name="slug" value={p.slug} />
                  <button className="btn btn-gold btn-sm">Add to my Journey</button>
                </MemberForm>
              )}
            </LuxCard>
          ))}
        </div>
        {isStaff(viewer) && <p className="mt-3 text-xs text-faint">Owner: packages appear for purchase here after you publish prices in the Journey Intelligence Center. Before launch, purchases work only with Stripe test keys.</p>}
      </LuxSection>

      <LuxSection title="Auto-Reload" intro="Off unless you turn it on. You choose the package and your own monthly limit — or no personal limit.">
        {ar?.enabled ? (
          <div className="glass flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <span><span className="block font-semibold">Auto-Reload is on</span><span className="block text-sm text-muted">{ar.package_slug?.replace("messages-", "")} messages when your allowance runs out · {ar.monthly_cap_cents == null ? "no personal monthly limit" : `up to ${money(ar.monthly_cap_cents)} a month`}</span></span>
            <MemberForm action={disableAutoReload}><button className="btn btn-gold">Turn off Auto-Reload</button></MemberForm>
          </div>
        ) : published ? (
          <MemberForm action={enableAutoReload} className="glass space-y-4 p-6">
            <label className="block text-sm">Package to add each time
              <select name="package" className="field mt-1 w-full">{list.map((p) => <option key={p.slug} value={p.slug}>{p.messages} messages — {p.price_cents ? money(p.price_cents) : ""}</option>)}</select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <label className="block text-sm">My monthly limit ($)<input name="cap" inputMode="decimal" className="field mt-1 w-full" placeholder="50.00" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="noCap" /> No personal monthly limit</label>
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" className="mt-1" required />
              <span>I authorize The Art of Connect to charge my saved card for this package each time my allowance runs out, within my limit. Company safeguards may limit reloads. I&rsquo;ll receive an email for each charge and can turn this off anytime.</span></label>
            <button className="btn btn-gold">Save my card and turn on Auto-Reload</button>
          </MemberForm>
        ) : (
          <div className="glass p-6 text-sm text-muted">Auto-Reload becomes available with Journey Plus.</div>
        )}
      </LuxSection>

      {(purchases ?? []).length > 0 && (
        <LuxSection title="Your Journey purchases">
          <ul className="glass divide-y divide-line text-sm">
            {(purchases ?? []).map((p) => (
              <li key={p.id} className="flex justify-between px-5 py-3"><span>{p.quantity} {p.kind === "session" ? "session" : p.kind.replace("_", " ")}{p.auto_reload ? " · Auto-Reload" : ""}</span><span>{money(p.amount_cents)} · {p.status}</span></li>
            ))}
          </ul>
        </LuxSection>
      )}
      <div className="mt-10"><Notice>Nothing is ever purchased automatically unless you turn on Auto-Reload. Additional messages are added only after your payment succeeds.</Notice></div>
    </>
  );
}
