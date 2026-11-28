import { SelfBanner } from "@/components/SelfBanner";
import Link from "next/link";
import { requireExperience, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LOVE_LANGUAGES, isLanguage, pairInsights } from "@/lib/love-languages";

export const metadata = { title: "Love languages together" };
export const dynamic = "force-dynamic";

const names = (r: string[] | null | undefined) => (r ?? []).filter(isLanguage).map((k) => LOVE_LANGUAGES[k].name);

export default async function LoveLanguagesTogether() {
  const { viewer, preview: staffPreview } = await requireExperience("relationships");
  const preview = isInsidePreview(viewer);
  const supabase = (await createClient())!;
  const [{ data: mine }, { data: couple }, { data: partnerRows }] = preview ? [{ data: null }, { data: null }, { data: null }] : await Promise.all([
    supabase.from("love_language_profiles").select("receive_rank, express_rank, share_with_partner, share_with_matches").eq("user_id", viewer.id).maybeSingle(),
    supabase.schema("relationships").from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("partner_love_language"),
  ]);
  const partner = (partnerRows as { display_name: string | null; receive_rank: string[]; express_rank: string[]; feel_connected: string | null; feel_unappreciated: string | null }[] | null)?.[0];
  const pname = partner?.display_name?.split(" ")[0] ?? "your partner";
  const top = partner?.receive_rank?.[0];

  return (
    <>
      {staffPreview && <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold">Preview — In Love is not open to members yet.</p>}
      <SelfBanner section="love-languages" actions={[{ href: "/app/know-yourself/love-languages#profile", label: mine ? "Update my profile" : "Discover my love languages", primary: true }]} />
      <p className="mt-5 max-w-2xl text-muted">Understand how you each feel loved, how you each show it, and where your needs may differ. Insight, never a score.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="glass p-7">
          <p className="eyebrow">My love languages</p>
          {mine?.receive_rank?.length ? (
            <>
              <p className="mt-3 text-sm text-muted">I feel most loved through</p>
              <p className="display text-2xl">{names(mine.receive_rank).slice(0, 2).join(" · ")}</p>
              <p className="mt-3 text-sm text-muted">I naturally show love through</p>
              <p className="display text-2xl">{names(mine.express_rank).slice(0, 2).join(" · ")}</p>
              <p className="mt-4 text-xs text-muted">Shared with {[mine.share_with_partner && "my partner", mine.share_with_matches && "mutual matches"].filter(Boolean).join(" and ") || "no one — private to me"}.</p>
            </>
          ) : (
            <p className="mt-3 text-muted">You haven’t created your optional Love Language Profile yet. <Link href="/app/know-yourself/love-languages#profile" className="text-gold underline">Discover yours</Link> — it takes about two minutes.</p>
          )}
        </section>

        <section className="theme-dark relative overflow-hidden rounded-[24px] bg-ink p-7">
          <div className="glow-breathe pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgb(197_165_114/0.4),transparent_70%)]" aria-hidden="true" />
          <p className="eyebrow relative">{couple ? "My partner" : "For singles"}</p>
          {partner ? (
            <div className="relative">
              <p className="mt-3 text-sm text-muted">{pname} feels most loved through</p>
              <p className="display text-2xl text-gold-bright">{names(partner.receive_rank).slice(0, 2).join(" · ")}</p>
              {partner.feel_connected && <p className="mt-3 text-sm"><span className="text-muted">Feels connected when </span>{partner.feel_connected}</p>}
              {partner.feel_unappreciated && <p className="mt-2 text-sm"><span className="text-muted">Feels unappreciated when </span>{partner.feel_unappreciated}</p>}
            </div>
          ) : couple ? (
            <p className="relative mt-3 text-muted">Your partner’s profile appears here only if they choose to share it with you.</p>
          ) : (
            <p className="relative mt-3 text-muted">When you and a match have both connected, you’ll see each other’s love languages — only if each of you chooses to share. It’s one insight among many, never a measure of compatibility.</p>
          )}
        </section>
      </div>

      {partner && mine?.receive_rank?.length ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="glass p-7">
            <p className="eyebrow">Understanding each other</p>
            <ul className="mt-4 space-y-3">{pairInsights({ receive: mine.receive_rank, express: mine.express_rank }, { receive: partner.receive_rank, express: partner.express_rank }).map((t) => <li key={t} className="flex gap-2"><span className="text-gold">◆</span>{t}</li>)}</ul>
          </div>
          {isLanguage(top) && (
            <div className="glass p-7">
              <p className="eyebrow">Small ways to love {pname} this week</p>
              <ul className="mt-4 space-y-2">{LOVE_LANGUAGES[top].showIt.map((t) => <li key={t} className="flex gap-2"><span className="text-gold">♡</span>{t}</li>)}</ul>
              <p className="mt-4 text-xs text-muted">What may hurt: {LOVE_LANGUAGES[top].mayHurt}</p>
            </div>
          )}
        </section>
      ) : null}

      <p className="mt-10 text-center text-sm text-muted">Love languages are preferences that change with life — not personality types, and never the sole factor in compatibility. Shared values, honest communication and respect matter just as much.</p>
      <p className="mt-3 text-center"><Link href="/app/journey" className="btn btn-ghost btn-sm">Explore this with Journey</Link></p>
    </>
  );
}
