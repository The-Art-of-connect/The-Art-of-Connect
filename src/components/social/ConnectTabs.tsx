"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/connect", label: "Feed", exact: true },
  { href: "/app/connect/circles", label: "Circles" },
  { href: "/app/connect/events", label: "Connect Calendar" },
  { href: "/app/connect/people", label: "People" },
  { href: "/app/connect/messages", label: "Messages" },
  { href: "/app/connect/profile", label: "My profile" },
];

/** Section navigation for the social ecosystem. Scrolls sideways on phones. */
export function ConnectTabs({ unread = 0, requests = 0 }: { unread?: number; requests?: number }) {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="Connect" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {TABS.map((t) => {
          const on = t.exact ? path === t.href : path.startsWith(t.href);
          const badge = t.label === "Messages" ? unread : t.label === "People" ? requests : 0;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${on ? "border-gold bg-gold/15 font-semibold text-gold-deep" : "border-line hover:border-gold/60"}`}>
                {t.label}{badge > 0 && <span className="rounded-full bg-[#e8701a] px-1.5 text-[0.65rem] font-semibold text-white">{badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
