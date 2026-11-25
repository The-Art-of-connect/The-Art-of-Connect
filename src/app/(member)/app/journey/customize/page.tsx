import Link from "next/link";
import { getViewer, hasRole, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getJourneyStatus } from "@/lib/journey-server";
import { cleanPrefs, DEFAULT_PREFS } from "@/lib/journey-customize";
import { saveJourneyPrefs } from "@/app/actions/customize";
import { CustomizeJourney } from "@/components/CustomizeJourney";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customize Your Journey" };

export default async function CustomizePage() {
  const viewer = (await getViewer())!;
  const status = await getJourneyStatus();
  const paid = status.access === "standard" || status.access === "enhanced" || (status.access === "staff" && hasRole(viewer, ["owner"]));
  const supabase = await createClient();
  const { data: row } = supabase && !isInsidePreview(viewer)
    ? await supabase.from("journey_voice_preferences").select("presentation, voice, age_style, language, accent, personality, pace, avatar").eq("user_id", viewer.id).maybeSingle()
    : { data: null };
  const initial = row ? cleanPrefs({ ...row, age: row.age_style }) : DEFAULT_PREFS;

  return (
    <>
      <Link href="/app/journey" className="text-sm font-semibold text-gold">← Journey</Link>
      <h1 className="display mt-4 text-4xl sm:text-5xl">Customize Your Journey</h1>
      <p className="mt-2 max-w-2xl text-muted">Choose how Journey sounds and speaks with you, in writing and in live, two-way voice conversations. Included with every paid membership, with no customization fee.</p>
      <div className="mt-8">
        {paid ? (
          <CustomizeJourney initial={initial} action={saveJourneyPrefs} />
        ) : (
          <div className="glass mx-auto max-w-2xl p-8 text-center">
            <p className="display text-2xl">Journey is a paid membership benefit</p>
            <p className="mt-2 text-sm text-muted">Every paid membership includes Journey, with written and live voice conversations within your monthly allowance, and a Journey personalized to you.</p>
            <Link href="/membership" className="btn btn-gold btn-sm mt-5">Explore memberships</Link>
          </div>
        )}
      </div>
    </>
  );
}
