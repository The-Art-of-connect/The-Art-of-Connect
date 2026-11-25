const PATHS: Record<string, string> = {
  know: "M12 3.5a8.5 8.5 0 0 0-8.5 8.5M12 7a5 5 0 0 0-5 5v2m10-2a5 5 0 0 0-5-5m5 5c0 3-1 5.5-2.5 7.5M12 11v3c0 2.5-.8 4.5-2 6M20.5 12a8.5 8.5 0 0 0-3-6.5",
  understand: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5z",
  honor: "M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6zm-3 8.5 2 2 4-4",
  educate: "M3.5 6.5C6 5.5 9 5.5 12 7c3-1.5 6-1.5 8.5-.5V18c-2.5-1-5.5-1-8.5.5-3-1.5-6-1.5-8.5-.5zM12 7v11.5",
  grow: "M12 20v-8m0 0c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6Zm0 0c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6Z",
  connect: "M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Zm-3-8.5h2.5l1-2 1.5 4 1-2H17",
};
export function PillarIcon({ pillar, className = "h-6 w-6" }: { pillar: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[pillar] ?? PATHS.know} />
    </svg>
  );
}
