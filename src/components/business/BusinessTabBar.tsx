"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  connect: "M12 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM6 15.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm12 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM12 8.5v3m0 0-5 4m5-4 5 4",
  learn: "M4 7.5h11v9H4zM15 10.5l5-3v9l-5-3",
  inbox: "M5 6h14v10H9l-4 3.5z",
  profile: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 8c.8-3.4 3.6-5 7-5s6.2 1.6 7 5",
};
const TABS = [
  { href: "/app/business", label: "Home", icon: I.home, exact: true },
  { href: "/app/business/board", label: "Connect", icon: I.connect },
  { href: "/app/business/learn", label: "Learn", icon: I.learn },
  { href: "/app/business/inbox", label: "Inbox", icon: I.inbox },
  { href: "/app/business/onboarding", label: "Profile", icon: I.profile },
];

/** Bottom navigation for The Professional Society on phones and tablets. */
export function BusinessTabBar() {
  const path = usePathname();
  return (
    <nav aria-label="The Professional Society" className="fixed inset-x-0 bottom-0 z-30 border-t border-champagne/40 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((t) => {
          const on = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[0.7rem] transition-colors ${on ? "text-burgundy font-semibold" : "text-gold"}`}>
                <svg viewBox="0 0 24 24" className={`h-6 w-6 transition-transform ${on ? "scale-110" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
