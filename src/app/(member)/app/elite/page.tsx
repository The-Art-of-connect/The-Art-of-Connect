import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EliteBadge } from "@/components/EliteBadge";
import { ELITE_EXPERIENCES, ELITE_TAGLINE } from "@/lib/elite";
import { EliteExperienceIcon } from "@/components/EliteIcons";
import { ActionForm } from "@/components/admin/ActionForm";
import { eliteSaveExperiences } from "@/app/actions/elite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Elite Concierge" };

type Tile = { title: string; body: string; href?: string; ready: boolean };
const TILES: Tile[] = [
  { title: "Private Journey Concierge", body: "Journey with your enhanced Elite allowance, in writing and live voice.", href: "/app/journey", ready: true },
  { title: "Membership & verification", body: "Your Elite Concierge membership, billing and verification status.", href: "/app/membership", ready: true },
  { title: "Elite privacy", body: "Show your profile to Elite members and your connections only, and control every photograph.", href: "/app/connect/profile", ready: true },
  { title: "Private Sessions", body: "Included with your membership, by text or voice.", href: "/app/journey/sessions", ready: true },
  { title: "Elite circles", body: "Verified peers, and every open circle you choose.", href: "/app/connect/circles?category=elite", ready: true },
  { title: "Elite Business Connections", body: "High-level networking, strategic partnerships, executive mentorship, expansion, acquisition and succession conversations.", ready: false },
  { title: "Elite Introductions", body: "Personalized professional and relationship introductions, curated with care.", ready: false },
  { title: "Elite In Love", body: "High-end dating and intentional connections between verified Elite singles (30+), by your choice only.", ready: false },
  { title: "Elite In Life", body: "Friendships, shared interests and exclusive social experiences with like-minded members.", ready: false },
  { title: "Elite Circle", body: "A private community of verified Elite members nationwide.", ready: false },
  { title: "Curated experiences & events", body: "Executive roundtables and exclusive social experiences.", ready: false },
  { title: "Private concierge requests", body: "Personal requests handled with discretion.", ready: false },
  { title: "Elite Knowledge Exchange", body: "Exclusive educational opportunities with distinguished members.", ready: false },
  { title: "Priority member support", body: "First in line, always.", href: "/app/support", ready: true },
];

/** The Elite Concierge dashboard: only for members with an active Elite badge (and the owner, for review). */
export default async function EliteDashboard() {
  const viewer = (await getViewer())!;
  const owner = hasRole(viewer, ["owner"]);
  const supabase = (await createClient())!;
  const { data: badge } = isInsidePreview(viewer) ? { data: null } : await supabase.from("elite_badges").select("status, issued_at").eq("user_id", viewer.id).maybeSingle();
  const active = badge?.status === "active";
  const { data: prefs } = isInsidePreview(viewer) ? { data: null } : await supabase.from("elite_experience_prefs").select("in_business, in_life, in_love, relationship_status").eq("user_id", viewer.id).maybeSingle();
  if (!active && !owner) redirect("/app/elite/eligibility");
  return (
    <div className="theme-dark -mx-4 -mt-10 px-4 pb-16 pt-10 sm:-mx-8 sm:px-8" style={{ background: "linear-gradient(180deg,#1b1310 0%,#241a15 60%,#1b1310 100%)" }}>
      {!active && owner && <p className="mb-6 rounded-2xl border border-[#e8892b]/50 bg-[#e8892b]/10 p-3 text-center text-xs text-[#f0a35a]">Owner review: members see this only with an active Elite badge.</p>}
      <section className="relative overflow-hidden rounded-[32px] border border-[#c9a96e]/40 px-6 py-12 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(232_112_26/0.18),transparent_70%),radial-gradient(40%_50%_at_100%_100%,rgb(122_46_62/0.35),transparent_70%)]" aria-hidden="true" />
        <p className="relative mx-auto flex w-fit items-center gap-2 text-xs uppercase tracking-[0.35em] text-[#f0c98a]">The Art of Connect</p>
        <h1 className="display relative mt-4 flex items-center justify-center gap-3 text-4xl text-[#f6e7c8] sm:text-6xl">Elite Concierge <EliteBadge size={34} /></h1>
        <p className="display relative mt-3 text-2xl italic text-[#e8892b]">{ELITE_TAGLINE}</p>
        <p className="relative mx-auto mt-4 max-w-xl text-sm text-[#f5ecdf]/75">Welcome{viewer.displayName ? `, ${viewer.displayName}` : ""}. Your Elite distinction is active{badge?.issued_at ? ` since ${new Date(badge.issued_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""}.</p>
      </section>

      <section className="mt-10">
        <h2 className="display text-center text-3xl text-[#f6e7c8]">Your Elite experiences</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#f5ecdf]/70">An elevated connection society. Take part in the experiences you choose; you can change them anytime.</p>
        <ActionForm action={eliteSaveExperiences} className="mx-auto mt-6 max-w-4xl space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            {ELITE_EXPERIENCES.map((x) => (
              <label key={x.id} className="flex cursor-pointer flex-col rounded-[24px] border border-[#c9a96e]/40 bg-white/[0.03] p-5 has-[:checked]:border-[#e8892b]">
                <span className="flex items-center justify-between text-[#f0c98a]"><EliteExperienceIcon kind={x.icon} /><input type="checkbox" name={x.id} defaultChecked={Boolean(prefs?.[x.id as "in_business" | "in_life" | "in_love"])} /></span>
                <span className="display mt-3 text-2xl text-[#f0c98a]">{x.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-[#f5ecdf]/75">{x.body}</span>
                {!x.ready && <span className="mt-3 text-[0.62rem] uppercase tracking-wider text-[#f5ecdf]/50">Connections in preparation</span>}
              </label>
            ))}
          </div>
          <label className="mx-auto block max-w-sm text-center text-xs text-[#f5ecdf]/70">Relationship status (needed only for In Love)
            <select name="relationship_status" defaultValue={prefs?.relationship_status ?? ""} className="field mt-1 w-full">
              <option value="">Prefer not to say</option><option value="single">Single</option><option value="partnered">In a relationship</option><option value="married">Married</option>
            </select>
          </label>
          <p className="text-center text-[0.7rem] text-[#f5ecdf]/55">In Love is for single members 30 and older, and is never turned on automatically. Your choices are private.</p>
          <div className="text-center"><button className="btn btn-gold btn-sm">Save my experiences</button></div>
        </ActionForm>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="display text-2xl text-[#f0c98a]">{t.title}</p>
                {!t.ready && <span className="shrink-0 rounded-full border border-[#c9a96e]/40 px-2.5 py-0.5 text-[0.62rem] uppercase tracking-wider text-[#f5ecdf]/60">In preparation</span>}
              </div>
              <p className="mt-2 text-sm text-[#f5ecdf]/75">{t.body}</p>
            </>
          );
          return t.ready && t.href
            ? <Link key={t.title} href={t.href} className="rounded-[24px] border border-[#c9a96e]/40 bg-white/[0.03] p-6 transition hover:border-[#e8892b]">{inner}</Link>
            : <div key={t.title} className="rounded-[24px] border border-[#c9a96e]/20 bg-white/[0.02] p-6 opacity-80">{inner}</div>;
        })}
      </section>
      <p className="mt-8 text-center text-xs text-[#f5ecdf]/55">Services marked &ldquo;In preparation&rdquo; aren&rsquo;t available yet. Introductions and opportunities are never guaranteed, and nothing here offers investment advice. Your verification details are never shown to anyone.</p>
    </div>
  );
}
