import { SelfBanner } from "@/components/SelfBanner";
import Image from "next/image";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS, RESPECT_GUIDE, type Area } from "@/lib/know-yourself";
import { saveSelfDiscovery } from "@/app/actions/know-yourself";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Boundaries & non-negotiables" };
export const dynamic = "force-dynamic";

type Row = { area: Area; core_values: string | null; will_do: string | null; wont_do: string | null; say_it: string | null };

export default async function KnowYourself() {
  const viewer = (await getViewer())!;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("self_discovery").select("area, core_values, will_do, wont_do, say_it").eq("user_id", viewer.id);
  const answers = Object.fromEntries(((data ?? []) as Row[]).map((r) => [r.area, r])) as Partial<Record<Area, Row>>;
  const complete = AREAS.filter((a) => { const r = answers[a.key]; return r && (r.will_do || r.wont_do); });

  return (
    <>
      <SelfBanner section="boundaries" actions={[{ href: "#self", label: "Begin this reflection", primary: true }, { href: "/app/know-yourself", label: "Back to The Art of Knowing Yourself" }]} />

      <section className="mt-8 grid gap-3 sm:grid-cols-4" aria-label="Your progress">
        {AREAS.map((a, i) => {
          const done = complete.some((c) => c.key === a.key);
          return (
            <a key={a.key} href={`#${a.key}`} className={`lift tile-in rounded-2xl border p-4 ${done ? "border-champagne bg-champagne/20" : "border-line bg-ivory/60"}`} style={{ animationDelay: `${i * 80}ms` }}>
              <span className="text-[0.65rem] tracking-[0.22em] uppercase text-muted">{a.eyebrow}</span>
              <span className="display mt-1 block text-2xl">{a.title}</span>
              <span className={`mt-1 block text-xs font-semibold ${done ? "text-gold-deep" : "text-faint"}`}>{done ? "✓ Written" : "Not started"}</span>
            </a>
          );
        })}
      </section>
      <p className="mt-3 text-xs text-muted">Private by design: your answers are never shown to partners, matches, other members or The Art of Connect team. Educational reflection — not counseling or therapy.</p>

      {complete.length > 0 && (
        <section className="theme-dark relative mt-10 overflow-hidden rounded-[26px] bg-ink p-7 sm:p-10">
          <div className="glow-breathe pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(197_165_114/0.4),transparent_70%)]" aria-hidden="true" />
          <p className="eyebrow relative">My standards</p>
          <div className="relative mt-5 grid gap-6 md:grid-cols-2">
            {complete.map((a) => {
              const r = answers[a.key]!;
              return (
                <div key={a.key} className="border-l border-champagne/40 pl-5">
                  <p className="display text-2xl text-gold-bright">{a.title}</p>
                  {r.core_values && <p className="mt-2 text-sm"><span className="text-muted">I value</span> {r.core_values}</p>}
                  {r.will_do && <p className="mt-1 text-sm"><span className="text-muted">I will</span> {r.will_do}</p>}
                  {r.wont_do && <p className="mt-1 text-sm"><span className="text-muted">I won’t</span> {r.wont_do}</p>}
                  {r.say_it && <p className="display mt-2 text-lg italic">“{r.say_it}”</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {AREAS.map((a, i) => {
        const r = answers[a.key];
        return (
          <section key={a.key} id={a.key} className="glass mt-10 scroll-mt-24 overflow-hidden !p-0">
            <div className="grid lg:grid-cols-[2fr_3fr]">
              <div className="relative min-h-56 lg:min-h-full">
                <Image src={a.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/85 via-espresso/25 to-transparent" />
                <div className="absolute bottom-5 left-6 right-6 text-ivory">
                  <p className="text-[0.65rem] tracking-[0.25em] uppercase text-champagne">{i + 1} · {a.eyebrow}</p>
                  <h2 className="display mt-1 text-4xl">{a.title}</h2>
                </div>
              </div>
              <ActionForm action={saveSelfDiscovery} className="space-y-4 p-6 sm:p-8">
                <p className="text-muted">{a.intro}</p>
                <input type="hidden" name="area" value={a.key} />
                <label className="block space-y-1.5"><span className="text-sm font-semibold">{a.values}</span>
                  <input name="core_values" defaultValue={r?.core_values ?? ""} maxLength={2000} className="field" placeholder="e.g. honesty, peace, growth" /></label>
                <label className="block space-y-1.5"><span className="text-sm font-semibold">{a.will}</span>
                  <textarea name="will_do" defaultValue={r?.will_do ?? ""} maxLength={4000} className="field !min-h-[84px]" placeholder="I will…" /></label>
                <label className="block space-y-1.5"><span className="text-sm font-semibold">{a.wont}</span>
                  <textarea name="wont_do" defaultValue={r?.wont_do ?? ""} maxLength={4000} className="field !min-h-[84px]" placeholder="I won’t…" /></label>
                <label className="block space-y-1.5"><span className="text-sm font-semibold">{a.say}</span>
                  <textarea name="say_it" defaultValue={r?.say_it ?? ""} maxLength={4000} className="field !min-h-[84px]" placeholder="When it matters, I’ll say…" /></label>
                <p className="rounded-xl border border-champagne/40 bg-champagne/10 p-3 text-xs italic text-muted">Example: {a.example}</p>
                <button className="btn btn-gold">Save privately</button>
              </ActionForm>
            </div>
          </section>
        );
      })}

      <section id="respect" className="mt-12 scroll-mt-24">
        <p className="eyebrow">Saying it with respect</p>
        <h2 className="display mt-2 text-4xl">A boundary is a kindness — to you and to them.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RESPECT_GUIDE.map((g, i) => (
            <div key={g.title} className="glass lift tile-in p-6" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="display text-3xl text-gold">{i + 1}</span>
              <p className="mt-2 font-semibold">{g.title}</p>
              <p className="mt-1 text-sm text-muted">{g.body}</p>
            </div>
          ))}
        </div>
        <p className="display mt-10 text-center text-2xl italic text-gold-deep">Know yourself. Then connect with intention.</p>
      </section>
    </>
  );
}
