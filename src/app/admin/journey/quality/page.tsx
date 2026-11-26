import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { QualityRunner } from "@/components/admin/QualityRunner";

export const metadata = { title: "Journey quality tests" };
export const dynamic = "force-dynamic";

/** Owner-only: realistic multi-turn conversations to judge Journey's intelligence before approving her for members. */
export default async function JourneyQuality() {
  await requireStaff(["owner"]);
  const supabase = (await createClient())!;
  const [{ data: s }, { data: v }] = await Promise.all([
    supabase.from("journey_settings").select("enabled, paid_usage_authorized, owner_testing_enabled").maybeSingle(),
    supabase.from("journey_instruction_versions").select("version, status").neq("status", "retired").order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ready = Boolean(s?.enabled && s?.paid_usage_authorized && s?.owner_testing_enabled);
  const blueprint = v ? `Blueprint version ${v.version} (${v.status === "published" ? "published" : "draft, private to you"})` : "no Blueprint yet";
  return (
    <>
      <Link href="/admin/journey" className="text-sm text-gold">← Journey Intelligence Center</Link>
      <PageHeader eyebrow="Journey" title="Quality tests" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted">Nine realistic conversations, three messages each, with fictional members. Read how Journey listens, builds on answers, teaches and sounds. Edit the Blueprint or training, then run again. Nothing here reaches members, and Journey&rsquo;s intelligence is only marked approved when you approve it.</p>
      <QualityRunner ready={ready} blueprint={blueprint} />
    </>
  );
}
