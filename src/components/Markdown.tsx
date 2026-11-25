import Link from "next/link";
import { Fragment } from "react";

/** Minimal, safe Markdown for legal documents: ## headings, paragraphs, "-" lists, **bold** and [links](/path). No raw HTML. */
function inline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={`${key}-b${i++}`} className="font-semibold text-text">{m[1]}</strong>);
    else {
      const href = m[3];
      const safe = href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:");
      parts.push(safe ? <Link key={`${key}-l${i++}`} href={href} className="text-gold underline underline-offset-4">{m[2]}</Link> : m[2]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className="space-y-5 leading-relaxed text-muted">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (block.startsWith("## ")) return <h2 key={bi} className="display pt-6 text-3xl text-text">{block.slice(3)}</h2>;
        if (block.startsWith("### ")) return <h3 key={bi} className="pt-2 text-lg font-semibold text-text">{block.slice(4)}</h3>;
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={bi} className="list-disc space-y-2 pl-6 marker:text-gold">
              {lines.map((l, li) => <li key={li}>{inline(l.slice(2), `${bi}-${li}`)}</li>)}
            </ul>
          );
        }
        return <p key={bi}>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l, `${bi}-${li}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}
