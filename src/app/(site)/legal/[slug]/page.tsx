import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { getLegalDoc, getLegalDocs, isDraft } from "@/lib/legal";

export const dynamicParams = false;
export function generateStaticParams() {
  return getLegalDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = getLegalDoc((await params).slug);
  return doc ? { title: doc.title, description: doc.summary, alternates: { canonical: `/legal/${doc.slug}` }, robots: { index: !isDraft(doc) } } : {};
}

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = getLegalDoc((await params).slug);
  if (!doc) notFound();
  return (
    <div className="band theme-ivory">
      <article className="mx-auto max-w-3xl px-4 py-20 sm:px-8 lg:py-28">
        <Link href="/legal" className="text-sm text-gold hover:text-gold-bright">← All policies</Link>
        <h1 className="display mt-6 text-5xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-faint">Version {doc.version}</p>
        {isDraft(doc) && (
          <div className="mt-8 rounded-2xl border border-champagne/60 bg-champagne/10 p-5 text-sm">
            <strong>Draft — pending legal review.</strong> This document is being finalized with counsel and will be updated before membership enrollment opens. Bracketed items are still to be completed.
          </div>
        )}
        <div className="mt-10"><Markdown source={doc.body} /></div>
      </article>
    </div>
  );
}
