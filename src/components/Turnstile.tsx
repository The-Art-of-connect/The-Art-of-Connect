"use client";
import Script from "next/script";

/**
 * Cloudflare Turnstile widget. Renders nothing until the site key is set.
 * It adds a hidden "cf-turnstile-response" field that the server verifies.
 */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" data-size="flexible" data-appearance="interaction-only" />
    </>
  );
}
