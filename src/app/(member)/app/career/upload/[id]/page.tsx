import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, hasPaidAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LuxHero } from "@/components/Lux";
import { MemberForm } from "@/components/MemberForm";
import { createResume, enhanceUpload } from "@/app/actions/resume";

export const metadata = { title: "Your uploaded résumé" };
export const dynamic = "force-dynamic";

export default async function Upload({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getViewer())!;
  const db = await createClient();
  const { data: up } = db ? await db.from("resume_uploads").select("id, file_name, size_bytes, created_at, extracted_text").eq("id", id).maybeSingle() : { data: null };
  if (!up) notFound();
  const paid = hasPaidAccess(viewer);
  const readable = (up.extracted_text ?? "").length >= 200;
  return (
    <>
      <LuxHero eyebrow="Professional Portfolio" title="Your résumé is safely on file" tagline={up.file_name}>
        <p className="text-sm text-muted">Your original is preserved exactly as uploaded ({Math.round(up.size_bytes / 1024)} KB, {new Date(up.created_at).toLocaleDateString()}). It&apos;s private to you.</p>
      </LuxHero>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="glass p-6">
          <p className="eyebrow">What we read from your file</p>
          {readable
            ? <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm text-muted">{up.extracted_text}</pre>
            : <p className="mt-3 text-sm text-muted">We couldn&apos;t read text from this file. It may be a scanned image. A Word version usually works, or you can build your résumé with the guided form.</p>}
        </section>
        <aside className="space-y-4">
          {paid && readable ? (
            <MemberForm action={enhanceUpload} className="glass space-y-3 p-6">
              <input type="hidden" name="id" value={up.id} />
              <p className="display text-2xl">Let Journey refine it</p>
              <p className="text-sm text-muted">Journey improves formatting, grammar, your summary and accomplishment wording, and ATS compatibility, using only what you wrote. Where something is missing, it asks you instead of guessing.</p>
              <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Field you&apos;re focusing on (optional)</span><input name="industry" className="field w-full" placeholder="e.g. Hospitality management" /></label>
              <button className="btn btn-gold w-full">Prepare my enhanced draft</button>
              <p className="text-xs text-faint">Uses one Journey message from your allowance. Your email and phone number are removed before anything is sent, and nothing is used until you approve it.</p>
            </MemberForm>
          ) : (
            <div className="glass p-6 text-sm text-muted">{paid ? "Once we can read your file, Journey can refine it." : "Journey's personalized enhancement is part of paid memberships. You can rebuild your résumé in a template below, using the text on this page."}</div>
          )}
          <MemberForm action={createResume} className="glass space-y-3 p-6">
            <input type="hidden" name="template" value="signature" />
            <input type="hidden" name="title" value={`From ${up.file_name}`.slice(0, 120)} />
            <p className="display text-xl">Build it in a template</p>
            <p className="text-sm text-muted">Open the guided editor with this text beside you.</p>
            <button className="btn btn-ghost btn-sm">Start in Signature Professional</button>
          </MemberForm>
          <Link href="/app/career" className="block text-center text-sm text-gold underline">Back to My Professional Readiness</Link>
        </aside>
      </div>
    </>
  );
}
