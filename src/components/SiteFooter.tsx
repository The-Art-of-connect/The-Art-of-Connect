import Link from "next/link";
import { Ornament, Wordmark } from "@/components/Emblem";

export function SiteFooter() {
  return (
    <footer className="band theme-dark pt-20">
      <Ornament className="px-4" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark />
          <p className="eyebrow !tracking-[0.25em]">In Business. In Life. In Love.</p>
          <p className="display text-2xl italic">Life after 40. Connection with intention.</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            A premium membership for adults 40 and older seeking meaningful personal, professional and romantic connections.
          </p>
          <a href="mailto:info@theartofconnect.com" className="text-sm text-gold hover:text-gold-bright">
            info@theartofconnect.com
          </a>
        </div>
        {[
          { title: "Experiences", items: [["In Business", "/business"], ["In Life", "/life"], ["In Love", "/love"]] },
          { title: "Membership", items: [["Build Your Membership", "/membership#build"], ["Compare memberships", "/membership#compare"], ["Sign in", "/sign-in"]] },
          { title: "Company", items: [["For professionals", "/professionals"], ["Safety", "/legal/safety-policy"], ["Privacy", "/legal/privacy-policy"], ["Terms", "/legal/terms-of-service"], ["All policies", "/legal"]] },
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
        © {new Date().getFullYear()} The Art of Connect, LLC. All rights reserved.
      </p>
    </footer>
  );
}
