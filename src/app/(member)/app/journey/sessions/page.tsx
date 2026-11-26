import { getViewer, isInsidePreview, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/admin";
import { LuxCard, LuxHero, LuxSection, Notice, SafetyFooter } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { SessionRoom } from "@/components/SessionRoom";
import { buy, setSessionObjective } from "@/app/actions/journey-member";
import { hasAllAccess } from "@/lib/journey-commerce";
import { createAdminClient } from "@/lib/supabase/admin";
import { membershipFor } from "@/lib/journey-server";

export const metadata = { title: "Journey Private Sessions" };

const FALLBACK = [
  { slug: "clarity-15", name: "Clarity Session", minutes: 15, objective: "Untangle one question and leave with a clear next step.", price_cents: null as number | null },
  { slug: "discovery-30", name: "Discovery Session", minutes: 30, objective: "Explore a pattern, a decision or a relationship more deeply.", price_cents: null },
  { slug: "growth-45", name: "Personal Growth Session", minutes: 45, objective: "Guided reflection around a goal that matters to you.", price_cents: null },
  { slug: "transformation-60", name: "Transformation and Goal-Setting Session", minutes: 60, objective: "Define where you are going and build a realistic plan to get there.", price_cents: null },
];

export default async function Sessions() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const live = Boolean(supabase && !isInsidePreview(viewer));
  const [{ data: products }, { data: mine }] = live
    ? await Promise.all([
        supabase!.from("journey_session_products").select("slug, name, minutes, objective, price_cents").eq("is_active", true).order("sort_order"),
        supabase!.from("journey_sessions").select("id, product_slug, status, objective, ends_at, messages_used, summary, created_at").order("created_at", { ascending: false }).limit(20),
      ])
    : [{ data: null }, { data: [] }];
  const list = products?.length ? products : FALLBACK;
  const showPrices = Boolean(products?.length);
  const admin = createAdminClient();
  const allAccess = live && admin ? await hasAllAccess(viewer.id, (await membershipFor(admin, viewer.id))?.holderId) : false;
  return (
    <>
      <LuxHero eyebrow="Journey" title="Private Sessions" tagline="Focused. Structured. Entirely yours." tone="burgundy">
        <p className="max-w-2xl text-muted">{allAccess ? "Included with your Elite Concierge membership" : "Purchased separately"} and guided by Journey in writing or by voice. Each session has a clear objective, a guided conversation, time to reflect, practical next steps and an optional private summary.</p>
      </LuxHero>

      {(mine ?? []).filter((s) => s.status === "purchased" || s.status === "active").map((s) => (
        <section key={s.id} className="mt-10">
          <p className="eyebrow">Your session · {list.find((p) => p.slug === s.product_slug)?.name}</p>
          {s.status === "purchased" && (
            <MemberForm action={setSessionObjective} className="glass mt-4 grid gap-3 p-6 sm:grid-cols-[1fr_auto]">
              <input type="hidden" name="id" value={s.id} />
              <input name="objective" defaultValue={s.objective ?? ""} maxLength={500} className="field" placeholder="What would you like from this session?" />
              <button className="btn btn-ghost">Save objective</button>
            </MemberForm>
          )}
          <div className="mt-4"><SessionRoom sessionId={s.id} endsAt={s.ends_at} /></div>
        </section>
      ))}

      <LuxSection title="Choose your session">
        <div className="grid gap-5 sm:grid-cols-2">
          {list.map((p) => (
            <LuxCard key={p.slug} mark={String(p.minutes)} title={p.name} body={p.objective} badge={allAccess ? "Included" : showPrices && p.price_cents ? money(p.price_cents) : "Pricing soon"}>
              <p className="text-xs text-faint">minutes · text or voice</p>
              {(showPrices || allAccess) && (
                <MemberForm action={buy} className="mt-4">
                  <input type="hidden" name="kind" value="session" /><input type="hidden" name="slug" value={p.slug} />
                  <button className="btn btn-gold btn-sm">{allAccess ? "Begin this session" : "Book this session"}</button>
                  {isStaff(viewer) && <p className="mt-2 text-xs text-faint">Owner: works with Stripe test keys before launch.</p>}
                </MemberForm>
              )}
            </LuxCard>
          ))}
        </div>
      </LuxSection>

      {(mine ?? []).some((s) => s.summary) && (
        <LuxSection title="Your private summaries">
          <div className="space-y-4">
            {(mine ?? []).filter((s) => s.summary).map((s) => (
              <article key={s.id} className="glass p-6"><p className="text-xs text-faint">{new Date(s.created_at).toLocaleDateString()}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{s.summary}</p></article>
            ))}
          </div>
        </LuxSection>
      )}
      <div className="mt-10 space-y-3">
        <Notice>You authorize each payment before a session begins. Your session time starts with your first message, ends at its limit, and is never extended or charged again without your permission.</Notice>
        <Notice>Journey Private Sessions are AI-guided personal development. They are not therapy, psychotherapy, diagnosis or treatment. If you&rsquo;d like support from a qualified professional, Journey can help you explore that option.</Notice>
      </div>
      <SafetyFooter />
    </>
  );
}
