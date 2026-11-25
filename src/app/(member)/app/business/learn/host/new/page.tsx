import Link from "next/link";
import { requireExperience } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WebinarForm } from "@/components/WebinarForm";

export const metadata = { title: "Create a webinar" };
export const dynamic = "force-dynamic";

export default async function NewWebinar() {
  await requireExperience("business");
  const supabase = (await createClient())!;
  const biz = supabase.schema("business");
  const [{ data: canHost }, { data: topics }, { data: industries }] = await Promise.all([
    biz.rpc("can_host"),
    biz.from("webinar_topics").select("slug, name").eq("is_active", true).order("sort_order"),
    biz.from("industries").select("slug, name").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/business/learn" className="text-sm text-gold">← The Knowledge Exchange</Link>
      <h1 className="display mt-4 text-4xl">Create a webinar</h1>
      {canHost ? (
        <>
          <p className="mt-2 mb-8 text-muted">Share what you know with business owners across cities and states. Our team can help with your flyer and images.</p>
          <WebinarForm w={null} topics={topics ?? []} industries={industries ?? []} />
        </>
      ) : (
        <p className="mt-6 rounded-2xl border border-champagne/50 bg-champagne/10 p-6 text-sm text-muted">
          Hosting is included with Professional Society membership and opens soon. <Link href="/app/business/learn" className="text-gold underline">Register your interest</Link>.
        </p>
      )}
    </div>
  );
}
