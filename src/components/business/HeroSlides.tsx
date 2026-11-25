"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/images/society/roundtable.webp", alt: "Business owners gathered around a boardroom table above the city" },
  { src: "/images/society/skyline-sunset.webp", alt: "A leadership meeting at sunset in a penthouse boardroom" },
  { src: "/images/society/boardroom-glass.webp", alt: "Colleagues collaborating in a glass boardroom" },
  { src: "/images/society/boardroom-atlanta.webp", alt: "Executives in conversation overlooking the skyline" },
];

/** Slow cross-fading photographs with a gentle zoom. Pauses for reduced-motion users. */
export function HeroSlides() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {SLIDES.map((s, n) => (
        <div key={s.src} className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${n === i ? "opacity-100" : "opacity-0"}`} aria-hidden={n !== i}>
          <Image src={s.src} alt={s.alt} fill priority={n === 0} sizes="(min-width: 1280px) 1200px, 100vw" className={`object-cover ${n === i ? "kenburns" : ""}`} />
        </div>
      ))}
      <div className="absolute bottom-3 right-4 z-10 flex gap-1.5" aria-hidden="true">
        {SLIDES.map((s, n) => <span key={s.src} className={`h-1.5 rounded-full transition-all duration-700 ${n === i ? "w-6 bg-gold-bright" : "w-1.5 bg-ivory/50"}`} />)}
      </div>
    </>
  );
}
