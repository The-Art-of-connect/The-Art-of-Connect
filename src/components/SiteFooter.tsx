import Link from "next/link";
import { Wordmark } from "@/components/Emblem";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            A private membership for the relationships that shape a life — in love, in business, and in growth.
          </p>
          <a href="mailto:info@theartofconnect.com" className="text-sm text-gold hover:text-gold-bright">
            info@theartofconnect.com
          </a>
        </div>
        {[
          { title: "Experiences", items: [["Relationships", "/relationships"], ["Business", "/business"], ["Counseling", "/counseling"]] },
          { title: "Membership", items: [["Packages", "/membership"], ["Request invitation", "/#waitlist"], ["Sign in", "/sign-in"]] },
          { title: "Trust", items: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Counselor applications", "/counseling#providers"]] },
        ].map((col) => (
          <div key={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-3 text-sm text-muted">
              {col.items.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-text">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="hairline" />
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-faint sm:px-8">
        © {new Date().getFullYear()} The Art of Connect. All rights reserved.
      </p>
    </footer>
  );
}
