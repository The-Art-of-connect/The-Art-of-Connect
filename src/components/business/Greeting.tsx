"use client";
import { useEffect, useState } from "react";

/** “Good morning, Tabitha.” — uses the member's own clock. */
export function Greeting({ name }: { name: string | null }) {
  const [part, setPart] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);
  const first = name?.trim().split(/\s+/)[0];
  return (
    <h2 className="display text-3xl sm:text-4xl">
      <span className={part ? "ticker-in inline-block" : "opacity-0"}>{part ?? "Welcome"}</span>
      {first ? <>, <span className="gilded italic">{first}</span>.</> : "."}
    </h2>
  );
}
