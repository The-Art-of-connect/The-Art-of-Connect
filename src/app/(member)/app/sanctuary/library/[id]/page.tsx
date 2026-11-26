import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, isInsidePreview } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TOPIC_LABEL, type Content } from "@/lib/sanctuary";
import { LuxSection, Notice } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { SanctuaryTabs } from "@/components/SanctuaryTabs";
import { saveEntry } from "@/app/actions/sanctuary";

export const dynamic = "force-dynamic";

export default async function SanctuaryLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = (await getViewer())!;
  const db = (await createClient())!;
  const { data } = await db.from("sanctuary_content").select("id, kind, topic, title, body, example, reflection, activity, course, course_order").eq("id", id).eq("kind", "lesson").eq("status", "published").maybeSingle();
  if (!data) notFound();
  const l = data as Content;
  const day = new Date().toISOString().slice(0, 10);
  const { data: entry } = !isInsidePreview(viewer) && !viewer.viewAs
    ? await db.from("sanctuary_entries").select("response").eq("user_id", viewer.id).eq("day", day).eq("kind", "lesson").maybeSingle()
    : { data: null };
  return (
    <>
      <SanctuaryTabs current="/app/sanctuary/library" />
      <article className="mx-auto max-w-3xl">
        <p className="eyebrow">{l.topic ? TOPIC_LABEL[l.topic] : "Life lesson"}</p>
        <h1 className="display mt-3 text-5xl">{l.title}</h1>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{l.body}</p>
        {l.example && <LuxSection eyebrow="In practice" title="An example"><p className="glass p-6 leading-relaxed">{l.example}</p></LuxSection>}
        {l.activity && <LuxSection eyebrow="Try this" title="Activity"><p className="glass p-6 leading-relaxed">{l.activity}</p></LuxSection>}
        {l.reflection && (
          <LuxSection eyebrow="Reflect" title="A question for you">
            <MemberForm action={saveEntry} className="glass p-6">
              <p className="display text-xl">{l.reflection}</p>
              <input type="hidden" name="kind" value="lesson" /><input type="hidden" name="content_id" value={l.id} />
              <textarea name="response" rows={4} maxLength={4000} defaultValue={entry?.response ?? ""} className="field mt-3 w-full" placeholder="Your private reflection" />
              <button className="btn btn-ghost btn-sm mt-2">Save privately</button>
            </MemberForm>
          </LuxSection>
        )}
        <Notice>Educational content for reflection and growth, not therapy, financial advice or a clinical assessment.</Notice>
        <p className="mt-6"><Link href="/app/sanctuary/library" className="text-gold underline">Back to the library</Link></p>
      </article>
    </>
  );
}
