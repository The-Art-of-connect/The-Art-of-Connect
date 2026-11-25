const P: Record<string, string> = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  self: "M12 20v-6m0 0c-3 0-5-2-5-4.5 0-1.8 1.2-3 3-3 .8 0 1.5.3 2 .8.5-.5 1.2-.8 2-.8 1.8 0 3 1.2 3 3 0 2.5-2 4.5-5 4.5Zm0-7.5V9M9 20h6",
  connect: "M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z",
  journey: "M4 6h11v8H8l-4 3zM15 9h5v8l-3-2h-6v-1",
  profile: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 8c.8-3.4 3.6-5 7-5s6.2 1.6 7 5",
  professional: "M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16",
  counseling: "M12 20c-4-2.5-7-5.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 3.5-3 6.5-7 9ZM9 12h6M12 9v6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m6 9 6 6 6-6",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
};
export function NavIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]} /></svg>;
}
