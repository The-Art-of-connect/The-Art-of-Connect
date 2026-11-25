"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget (Managed mode). Renders nothing until the site
 * key is set. It adds a hidden "cf-turnstile-response" field to the form; the
 * server verifies that token with Cloudflare before acting.
 *
 *  • action binds the token to one form, so it can't be replayed elsewhere.
 *  • Tokens are single-use: pass the form's result as resetSignal so a new
 *    token is issued after every submission.
 *  • Expired tokens (5 minutes) refresh automatically.
 */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const turnstileEnabled = Boolean(SITE_KEY);

let loader: Promise<void> | null = null;
function loadScript() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.turnstile) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** True when the form may be submitted (always true when Turnstile is off). */
export function useTurnstileReady() {
  return useState(!turnstileEnabled);
}

export function Turnstile({ action, resetSignal, onReady }: { action: string; resetSignal?: unknown; onReady?: (ready: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  const [problem, setProblem] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          action,
          theme: "light",
          size: "flexible",
          appearance: "interaction-only",
          "refresh-expired": "auto",
          "response-field-name": "cf-turnstile-response",
          callback: () => {
            setProblem(null);
            ready.current?.(true);
          },
          "expired-callback": () => ready.current?.(false),
          "error-callback": () => {
            ready.current?.(false);
            setProblem("The security check couldn’t complete. Please refresh the page and try again.");
          },
        });
      })
      .catch(() => setProblem("The security check couldn’t load. Please check your connection and refresh the page."));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [action]);

  // A token can be used once: get a fresh one after each submission.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (widget.current && window.turnstile) {
      ready.current?.(false);
      window.turnstile.reset(widget.current);
    }
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={box} />
      {problem && <p className="text-sm text-danger" role="alert">{problem}</p>}
    </div>
  );
}
