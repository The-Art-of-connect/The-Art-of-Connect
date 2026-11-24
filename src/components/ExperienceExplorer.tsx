"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EXPERIENCES, EXPERIENCE_ORDER } from "@/lib/experiences";

/** Interactive tabs: choose an experience to see its story, image and features. */
export function ExperienceExplorer() {
  const [active, setActive] = useState(EXPERIENCE_ORDER[1]);
  const e = EXPERIENCES[active];

  return (
    <div>
      <div role="tablist" aria-label="Experiences" className="grid grid-cols-3 gap-2 rounded-full border border-line-strong p-1.5">
        {EXPERIENCE_ORDER.map((key) => {
          const x = EXPERIENCES[key];
          const selected = key === active;
          return (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={selected}
              aria-controls={`panel-${key}`}
              onClick={() => setActive(key)}
              className={`min-h-11 rounded-full px-2 text-xs font-semibold tracking-wide transition-all sm:text-sm ${selected ? "bg-gold text-onyx shadow-[0_8px_30px_-10px_rgb(201_173_131/0.7)]" : "text-muted hover:text-text"}`}
            >
              {x.name}
            </button>
          );
        })}
      </div>

      <div id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} key={active} className="explorer-panel mt-8 grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-line-strong lg:aspect-[5/4]">
          <Image src={e.image} alt={e.imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-onyx/90 via-onyx/20 to-transparent" />
          <p className="display absolute bottom-5 left-6 text-3xl text-ivory sm:text-4xl">{e.caption}</p>
        </div>
        <div>
          <p className="eyebrow">{e.subtitle}</p>
          <h3 className="display mt-4 text-5xl sm:text-6xl">{e.name}</h3>
          <p className="mt-5 leading-relaxed text-muted">{e.summary}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {e.pillars.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-text">
                <span className="h-px w-5 shrink-0 bg-gold" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <Link href={e.href} className="btn btn-ghost mt-9">Explore {e.name}</Link>
        </div>
      </div>
    </div>
  );
}
