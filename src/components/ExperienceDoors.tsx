"use client";
import Image from "next/image";
import { GatedLink } from "@/components/Upgrade";

/** The three foundational experiences (founder directive 35): In Life, In Love, In Business. Owner imagery only. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExperienceDoors({ love, business }: { love: boolean; business: boolean }) {
  const doors = [
    { title: "In Life", line: "Discover yourself. Become more.", href: "/app/life", what: "", img: "/images/in-life.webp" },
    { title: "In Love", line: "Create meaningful connections.", href: "/app/relationships", what: "Experience a more intentional approach to love, relationships and compatibility.", img: "/images/in-love.webp" },
    { title: "In Business", line: "Connect. Collaborate. Prosper.", href: "/app/business", what: "Connect, collaborate and grow with business owners and mentors.", img: "/images/in-business.webp" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {doors.map((d) => (
        <GatedLink key={d.title} href={d.href} feature={{ name: d.title, what: d.what }} className="group overflow-hidden rounded-[1.75rem] border border-line bg-[var(--surface,#fffdf8)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="relative aspect-[16/10] overflow-hidden"><Image src={d.img} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" /></div>
          <div className="p-5"><p className="display text-3xl">{d.title}</p><p className="mt-1 text-sm text-muted">{d.line}</p></div>
        </GatedLink>
      ))}
    </div>
  );
}
