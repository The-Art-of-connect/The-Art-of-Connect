const PATHS: Record<string, string> = {
  lotus: "M12 19c-4 0-7-2.5-7-6 2.5 0 4.5 1 5.5 2.5M12 19c4 0 7-2.5 7-6-2.5 0-4.5 1-5.5 2.5M12 19c-2-1.5-3-4-3-6.5S10.5 7 12 5c1.5 2 3 5 3 7.5S14 17.5 12 19ZM8.5 9.5C6.5 9.5 5 10.5 4 12M15.5 9.5c2 0 3.5 1 4.5 2.5",
  sliders: "M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4",
  target: "M12 21a9 9 0 1 1 9-9M12 17a5 5 0 1 1 5-5M12 13a1 1 0 1 0 0-2M12 12l8-8m0 0h-3m3 0v3",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
  people: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 12.5a2.3 2.3 0 1 0 0-4.6M18 12.5a2.3 2.3 0 1 0 0-4.6M7 19c.6-2.8 2.6-4.5 5-4.5s4.4 1.7 5 4.5M2.5 18c.4-1.8 1.6-3 3.3-3.3M21.5 18c-.4-1.8-1.6-3-3.3-3.3",
  chat: "M5 6h14v10H9l-4 3.5z",
  mic: "M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3",
};
export function EIIcon({ name, className = "h-9 w-9" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.lotus} />
    </svg>
  );
}
