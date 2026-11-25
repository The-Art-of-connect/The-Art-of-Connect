"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

const I: Record<string, string> = {
  share: "M12 3v12m0-12-4 4m4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
  text: "M5 6h14v10H9l-4 3.5z",
  email: "M4 6h16v12H4zM4 7l8 6 8-6",
  copy: "M9 9h10v11H9zM5 15V4h10",
  whatsapp: "M5 19.5 6 16a7.5 7.5 0 1 1 2.8 2.7zM9.5 9.5c.3 2 2 3.7 4 4.2l1-1.2 1.8.8c-.2 1-1 1.7-2 1.7-3 0-6-3-6-6 0-1 .7-1.8 1.7-2l.8 1.8z",
  facebook: "M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2H8v3.5h2.5V20H14v-6.5h2.5l.5-3.5h-3V8.5a.5.5 0 0 1 .5-.5Z",
  messenger: "M12 4C7.6 4 4 7.3 4 11.4c0 2.3 1.1 4.4 2.9 5.7V20l2.7-1.5c.8.2 1.6.3 2.4.3 4.4 0 8-3.3 8-7.4S16.4 4 12 4Zm-4 9.5 3-3.2 1.7 1.6 3.3-1.6-3 3.2-1.7-1.6z",
  linkedin: "M5 9h3v10H5zM6.5 4.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4ZM10.5 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.5 1.7 3.5 4.2V19h-3v-5.3c0-1.3-.4-2.1-1.5-2.1s-2 .9-2 2.2V19h-3z",
  x: "M5 4.5h3.5l10.5 15H15.5zM18.5 4.5 13 10.8M11 13.2l-5.5 6.3",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z",
};

function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={I[name]} /></svg>;
}

/** Every way to share a member's personal referral link. Each channel is tagged for first-party campaign reporting. */
export function ReferralShare({ url, name }: { url: string; name?: string | null }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const tag = (src: string) => `${url}${url.includes("?") ? "&" : "?"}utm_source=${src}&utm_medium=referral&utm_campaign=member_referral`;
  const message = "I’d love for you to experience The Art of Connect — a private membership for meaningful connection in business, in life and in love.";
  const subject = `${name ? `${name.split(" ")[0]} invited you` : "You’re invited"} to The Art of Connect`;
  const enc = encodeURIComponent;

  const copy = async () => {
    try { await navigator.clipboard.writeText(tag("copy")); } catch { window.prompt("Copy your link:", tag("copy")); return; }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: subject, text: message, url: tag("share_sheet") }); } catch { /* cancelled */ }
  };
  const openQr = async () => {
    if (!qr) setQr(await QRCode.toDataURL(tag("qr"), { width: 560, margin: 1, color: { dark: "#211C18", light: "#F8F3E9" } }));
    setShowQr((v) => !v);
  };

  const links: { key: string; label: string; href: string }[] = [
    { key: "text", label: "Text", href: `sms:?&body=${enc(`${message} ${tag("sms")}`)}` },
    { key: "email", label: "Email", href: `mailto:?subject=${enc(subject)}&body=${enc(`${message}\n\n${tag("email")}`)}` },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(`${message} ${tag("whatsapp")}`)}` },
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(tag("facebook"))}` },
    { key: "messenger", label: "Messenger", href: `fb-messenger://share/?link=${enc(tag("messenger"))}` },
    { key: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(tag("linkedin"))}` },
    { key: "x", label: "X", href: `https://x.com/intent/post?text=${enc(message)}&url=${enc(tag("x"))}` },
  ];
  const tile = "lift flex flex-col items-center gap-1.5 rounded-2xl border border-champagne/40 bg-ivory/70 px-2 py-3.5 text-xs font-semibold text-gold-deep";

  return (
    <div className="mt-5 space-y-4">
      {canShare && (
        <button type="button" onClick={nativeShare} className="btn btn-gold shimmer w-full gap-2 sm:w-auto"><Icon name="share" /> Share my invitation</button>
      )}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
        {links.map((l) => (
          <a key={l.key} href={l.href} target={l.key === "text" || l.key === "email" || l.key === "messenger" ? undefined : "_blank"} rel="noreferrer" className={tile}>
            <Icon name={l.key} />{l.label}
          </a>
        ))}
        <button type="button" onClick={copy} className={tile}><Icon name="copy" />{copied ? "Copied!" : "Copy link"}</button>
        <button type="button" onClick={openQr} className={tile} aria-expanded={showQr}><Icon name="qr" />QR code</button>
      </div>
      <button type="button" onClick={copy} className="block w-full break-all rounded-xl border border-line bg-ink-3 px-4 py-3 text-left font-mono text-sm" aria-label="Copy your referral link">{url}</button>
      {showQr && qr && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-champagne/40 bg-ivory/70 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for your referral link" className="h-52 w-52 rounded-xl" />
          <p className="text-xs text-muted">Let a friend scan this with their phone camera — perfect for events and in-person introductions.</p>
          <a href={qr} download="the-art-of-connect-invitation.png" className="btn btn-ghost btn-sm">Download QR code</a>
        </div>
      )}
      <p className="text-xs text-faint">Instagram and TikTok: copy your link and add it to your bio, story or caption.</p>
    </div>
  );
}
