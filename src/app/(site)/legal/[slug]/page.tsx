import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { CATEGORY_LABEL, getPublicLegalDoc } from "@/lib/legal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = await getPublicLegalDoc((await params).slug);
  return doc
    ? { title: doc.title, description: doc.summary, alternates: { canonical: `/legal/${doc.slug}` }, robots: { index: doc.in_effect } }
    : {};
}

/** A single policy. Only the version in effect is ever shown; drafts stay private. */
export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = await getPublicLegalDoc((await params).slug);
  if (!doc) notFound();
  return (
    <div className="band theme-cream">
      <article className="print-doc mx-auto max-w-3xl px-4 py-20 sm:px-8 lg:py-28">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link href="/legal" className="text-sm text-gold hover:text-gold-bright">← Legal & Policy Center</Link>
          {doc.in_effect && <PrintButton />}
        </div>
        <p className="eyebrow mt-8">{CATEGORY_LABEL[doc.category] ?? "Policy"}</p>
        <h1 className="display mt-4 text-5xl">{doc.title}</h1>
        {doc.in_effect ? (
          <>
            <p className="mt-3 text-sm text-muted">Effective {doc.effective_date} · Version {doc.version} · The Art of Connect, LLC</p>
            <div className="legal-prose mt-10"><Markdown source={doc.body ?? ""} /></div>
          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-champagne/60 bg-champagne/10 p-6">
            <p className="font-semibold">This policy is being finalized.</p>
            <p className="mt-2 text-sm text-muted">{doc.summary}</p>
            <p className="mt-3 text-sm text-muted">It will be published here, with its effective date, once approved. It is not yet in effect.</p>
          </div>
        )}
        <p className="mt-14 border-t border-line pt-6 text-sm text-muted">Questions? Write to <span className="select-all text-gold">info@theartofconnect.com</span>.</p>
      </article>
    </div>
  );
}
