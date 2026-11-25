import Link from "next/link";
import { Wordmark } from "@/components/Emblem";
import { MobileMenu } from "@/components/MobileMenu";
import { SITE_NAV } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="theme-dark sticky top-0 z-40 border-b border-line !bg-espresso/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="The Art of Connect — home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted lg:flex" aria-label="Primary">
          {SITE_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="hidden text-sm text-muted hover:text-text lg:inline">Sign in</Link>
          <Link href="/membership#build" className="btn btn-gold btn-sm hidden sm:inline-flex">Build Your Membership</Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
