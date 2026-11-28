import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/admin";
import { LuxCard, LuxHero, LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { buy, disableAutoReload, enableAutoReload } from "@/app/actions/journey-member";
import { hasAllAccess } from "@/lib/journey-commerce";
import { createAdminClient } from "@/lib/supabase/admin";
import { membershipFor } from "@/lib/journey-server";

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
  const admin = createAdminClient();
  const m = live && admin ? await membershipFor(admin, viewer.id) : null;
  const allAccess = live ? await hasAllAccess(viewer.id, m?.holderId) : false;
  // Pay-as-you-go: a member without a paid membership buys Journey credits (directive 51 §4).
  const payg = live && !m;
  const [{ data: voicePacks }, { data: cost }] = admin ? await Promise.all([
    admin.from("journey_voice_packages").select("slug, minutes, price_cents").eq("is_active", true).order("sort_order"),
    admin.from("journey_settings").select("text_cost_cents_per_message, voice_cost_cents_per_minute, card_fee_percent, card_fee_fixed_cents, message_packages_published").maybeSingle(),
  ]) : [{ data: [] }, { data: null }];
  const sellable = Boolean(cost?.message_packages_published) || isStaff(viewer);
  const cents = (n: number) => `${n.toFixed(n < 1 ? 2 : 1)}¢`;
  const published = Boolean(packages?.length);
  const list = packages?.length ? packages : [25, 50, 100, 250].map((n) => ({ slug: `messages-${n}`, messages: n, price_cents: null as number | null }));
  return (
    <>
      <LuxHero eyebrow="Journey" title="Journey Plus" tagline={payg ? "Journey credits, only when you choose." : "More conversation, only when you choose."}>
        <p className="max-w-2xl text-muted">{payg
          ? "Pay as you go: without a paid membership, Journey credits let you talk with Journey in The Art of Becoming. One credit is one reply, priced at exactly our cost with no markup. Every lesson stays open to you at no cost either way."
          : allAccess
          ? "Your Elite Concierge membership includes the largest monthly Journey allowance for writing and voice. If you'd like more, additional usage is offered at exactly our cost, with no markup, and only when you choose."
          : "Your membership includes a generous monthly Journey allowance. If you'd like more, additional messages and voice minutes are offered at exactly our cost, with no markup, and only when you choose."}</p>
      </LuxHero>
      {sp.purchase === "success" && <div className="mt-8"><Notice>Thank you. Your messages are added as soon as your payment is confirmed — usually within a minute.</Notice></div>}
      {sp.autoreload === "on" && <div className="mt-8"><Notice>Your card is saved. Auto-Reload turns on as soon as your bank confirms it.</Notice></div>}

      {!payg && <LuxSection title="Additional voice minutes" intro={`Used after your included monthly minutes. Priced at our cost: ${cost ? cents(Number(cost.voice_cost_cents_per_minute)) : "the OpenAI rate"} per minute for the voice service, plus card processing (${cost ? `${Number(cost.card_fee_percent)}% + ${cost.card_fee_fixed_cents}¢` : "standard fees"}). No markup.`}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(voicePacks ?? []).map((v) => (
            <LuxCard key={v.slug} mark={String(v.minutes)} title={`${v.minutes} minutes`} badge={sellable && v.price_cents ? money(v.price_cents) : "Pricing soon"}>
              {cost && v.price_cents && <p className="text-xs text-muted">{money(Math.round(v.minutes * Number(cost.voice_cost_cents_per_minute)))} voice service + {money(v.price_cents - Math.round(v.minutes * Number(cost.voice_cost_cents_per_minute)))} card processing</p>}
              {sellable && v.price_cents && (
                <MemberForm action={buy}>
                  <input type="hidden" name="kind" value="voice_minutes" /><input type="hidden" name="slug" value={v.slug} />
                  <button className="btn btn-gold btn-sm mt-2">Add voice minutes</button>
                </MemberForm>
              )}
            </LuxCard>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">See your remaining minutes in <a href="/app/journey/voice" className="underline">Journey Live</a>. You&rsquo;re never charged unless you choose a package and confirm payment.</p>
      </LuxSection>}

      {<>
      <div id="credits" className="scroll-mt-24" /><LuxSection title={payg ? "Journey credits" : "Message packages"} intro={payg ? `One credit is one reply from Journey. Priced at our cost: about ${cost ? cents(Number(cost.text_cost_cents_per_message)) : "half a cent"} per reply, plus card processing.` : `Used after your monthly allowance. Priced at our cost: about ${cost ? cents(Number(cost.text_cost_cents_per_message)) : "half a cent"} per message, plus card processing. Included monthly messages don't roll over.`}>
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
      </>}

      {(purchases ?? []).length > 0 && (
        <LuxSection title="Your Journey purchases">
          <ul className="glass divide-y divide-line text-sm">
            {(purchases ?? []).map((p) => (
              <li key={p.id} className="flex justify-between px-5 py-3"><span>{p.quantity} {p.kind === "session" ? "session" : p.kind.replace("_", " ")}{p.auto_reload ? " · Auto-Reload" : ""}</span><span>{money(p.amount_cents)} · {p.status}</span></li>
            ))}
          </ul>
        </LuxSection>
      )}
      <div className="mt-10"><Notice>Nothing is ever purchased automatically unless you turn on Auto-Reload yourself. Additional messages and minutes are added only after your payment succeeds.</Notice></div>
    </>
  );
}
