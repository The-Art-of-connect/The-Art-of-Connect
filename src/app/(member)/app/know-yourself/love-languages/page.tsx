import Link from "next/link";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_KEYS, LOVE_LANGUAGES } from "@/lib/love-languages";
import { LivingHero } from "@/components/business/SocietyHero";
import { LoveLanguageForm } from "@/components/LoveLanguageForm";

export const metadata = { title: "How I give and receive love" };
export const dynamic = "force-dynamic";

export default async function LoveLanguages() {
  const viewer = (await getViewer())!;
  const preview = isInsidePreview(viewer);
  const supabase = (await createClient())!;
  const [{ data: p }, { data: couple }] = preview ? [{ data: null }, { data: null }] : await Promise.all([
    supabase.from("love_language_profiles").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.schema("relationships").from("couple_members").select("couple_id").eq("user_id", viewer.id).maybeSingle(),
  ]);
  return (
    <>
      <LivingHero
        slides={[
          { src: "/images/library/love/sunlit-anniversary.webp", alt: "A couple sharing a warm moment over dinner" },
          { src: "/images/library/love/cooking-together.webp", alt: "A couple laughing while cooking together" },
          { src: "/images/library/love/laughing-dinner.webp", alt: "A couple laughing together at dinner" },
        ]}
        eyebrow="The Art of Knowing Yourself · Understand Yourself" title="How you give and" gilded="receive love."
        subtitle="Discover what makes you feel truly loved, how you naturally show love, and what helps you feel connected — for dating, for partnership and for knowing yourself."
        cta={{ href: "#profile", label: p ? "Update my Love Language Profile" : "Discover my love languages" }}
        secondary={{ href: "/app/know-yourself", label: "Back to Who Am I?" }}
      />

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {LANGUAGE_KEYS.map((k, i) => (
          <article key={k} className="glass lift tile-in p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <p className="display text-2xl">{LOVE_LANGUAGES[k].name}</p>
            <p className="mt-1 text-sm italic text-gold-deep">{LOVE_LANGUAGES[k].essence}</p>
            <p className="mt-3 text-sm text-muted">{LOVE_LANGUAGES[k].feelsLike}</p>
          </article>
        ))}
      </section>
      <p className="mt-4 text-sm text-muted">Many of us express love one way and long to receive it another. These are preferences that can change with the seasons of life — never a label, and never the whole story of a relationship.</p>

      <div id="profile" className="mt-10 scroll-mt-24">
        <LoveLanguageForm coupled={Boolean(couple)} initial={{
          receive: p?.receive_rank ?? [], express: p?.express_rank ?? [], connected: p?.feel_connected ?? "", unappreciated: p?.feel_unappreciated ?? "", notes: p?.notes ?? "",
          sharePartner: p?.share_with_partner ?? false, shareMatches: p?.share_with_matches ?? false, useInJourney: p?.use_in_journey ?? true,
        }} />
      </div>
      <p className="mt-8 text-center text-sm"><Link href="/app/relationships/love-languages" className="text-gold underline">See love languages together — for dating and couples</Link></p>
    </>
  );
}
