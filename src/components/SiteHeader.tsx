import Link from "next/link";
import { Wordmark } from "@/components/Emblem";

const links = [
  { href: "/relationships", label: "Relationships" },
  { href: "/business", label: "Business" },
  { href: "/counseling", label: "Counseling" },
  { href: "/membership", label: "Membership" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="The Art of Connect — home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted lg:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="hidden text-sm text-muted hover:text-text sm:inline">
            Sign in
          </Link>
          <Link href="/#waitlist" className="btn btn-gold btn-sm">
            <span className="sm:hidden">Invite</span>
            <span className="hidden sm:inline">Request invitation</span>
          </Link>
        </div>
      </div>
      {/* Mobile: experiences as a swipeable rail */}
      <nav className="flex gap-6 overflow-x-auto border-t border-line px-4 py-3 text-xs tracking-wide text-muted lg:hidden" aria-label="Experiences">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="shrink-0 hover:text-gold-bright">
            {l.label}
          </Link>
        ))}
        <Link href="/sign-in" className="shrink-0 sm:hidden">Sign in</Link>
      </nav>
    </header>
  );
}
