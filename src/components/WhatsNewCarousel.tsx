"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { Feature } from "@/lib/features";

/** What's New at The Art of Connect: image cards from the owner's licensed library, scrollable with arrows. */
export function WhatsNewCarousel({ items }: { items: Feature[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div>
      <div className="flex items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f0c98a]">What&rsquo;s new at The Art of Connect</p>
        <span className="h-px flex-1 bg-[#c9a96e]/40" />
        <button type="button" onClick={() => go(-1)} aria-label="Previous" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a96e]/60 text-[#f0c98a] hover:bg-[#c9a96e]/15">‹</button>
        <button type="button" onClick={() => go(1)} aria-label="Next" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a96e]/60 text-[#f0c98a] hover:bg-[#c9a96e]/15">›</button>
      </div>
      <ul ref={ref} className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none]">
        {items.map((f) => (
          <li key={f.key} className="flex w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-15px)]">
            <Link href={f.href ?? "#"} className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-[#fbf7f0] shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)] ring-1 ring-[#c9a96e]/40 transition hover:-translate-y-1">
              <div className="relative aspect-[16/9] overflow-hidden">
                {f.image && <Image src={f.image} alt="" fill sizes="(min-width:1024px) 25vw, 80vw" className="object-cover transition duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {f.badge && <span className="absolute left-3 top-3 rounded-full bg-gradient-to-b from-[#e8c88a] to-[#b8925a] px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-espresso">{f.badge}</span>}
              </div>
              <div className="flex flex-1 items-end gap-3 p-5">
                <div className="flex-1">
                  <p className="display text-xl text-[#2a1a14]">{f.name}</p>
                  <p className="text-xs text-[#8a7462]">{new Date(`${f.released}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[#5b4a3f]">{f.what}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#b8925a] text-[#8a6a3a] transition group-hover:bg-champagne/20">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
