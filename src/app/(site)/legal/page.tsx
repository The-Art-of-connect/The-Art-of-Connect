import type { Metadata } from "next";
import Link from "next/link";
import { getLegalDocs, isDraft } from "@/lib/legal";

export const metadata: Metadata = { title: "Legal", description: "Terms, privacy, membership and safety policies of The Art of Connect.", alternates: { canonical: "/legal" } };

export default function LegalIndex() {
  const docs = getLegalDocs();
  return (
    <div className="band theme-ivory">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-8 lg:py-28">
        <p className="eyebrow">Legal</p>
        <h1 className="display mt-5 text-5xl sm:text-6xl">Policies & agreements</h1>
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {docs.map((d) => (
            <li key={d.slug}>
              <Link href={`/legal/${d.slug}`} className="flex flex-col gap-1 py-5 transition-colors hover:bg-ink-3 sm:flex-row sm:items-baseline sm:justify-between sm:px-3">
                <span>
                  <span className="text-lg font-semibold text-text">{d.title}</span>
                  <span className="block text-sm text-muted">{d.summary}</span>
                </span>
                {isDraft(d) && <span className="chip chip-locked shrink-0">Draft — pending legal review</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
