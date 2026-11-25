"use client";
import { useState } from "react";

/** Share links for a webinar: every link leads back to The Art of Connect, tagged by channel. */
export function ShareKit({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const tagged = (src: string) => `${url}${url.includes("?") ? "&" : "?"}ref=${src}`;
  const text = `Join me for "${title}" — a live business webinar on The Art of Connect.`;
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      window.prompt("Copy this:", value);
    }
  };
  const links: [string, string][] = [
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged("facebook"))}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(tagged("linkedin"))}`],
    ["Email", `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${tagged("email")}`)}`],
    ["Text message", `sms:?&body=${encodeURIComponent(`${text} ${tagged("sms")}`)}`],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {links.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="nav-pill text-sm">{label}</a>
        ))}
        <button type="button" onClick={() => copy("instagram", tagged("instagram"))} className="nav-pill text-sm">{copied === "instagram" ? "Copied for Instagram" : "Instagram (copy link)"}</button>
        <button type="button" onClick={() => copy("tiktok", tagged("tiktok"))} className="nav-pill text-sm">{copied === "tiktok" ? "Copied for TikTok" : "TikTok (copy link)"}</button>
        <button type="button" onClick={() => copy("link", tagged("share"))} className="nav-pill text-sm">{copied === "link" ? "Link copied" : "Copy link"}</button>
      </div>
      <p className="break-all text-xs text-muted">{url}</p>
      <p className="text-xs text-faint">Instagram and TikTok don’t accept shared links directly: download a graphic below, post it, and paste the copied link in your bio or caption.</p>
    </div>
  );
}
