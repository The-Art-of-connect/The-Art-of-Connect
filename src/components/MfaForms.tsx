"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const SETUP_KEY = "aoc_mfa_setup";

/** Enroll an authenticator app (TOTP) — Google Authenticator, 1Password, Authy, etc. */
export function MfaSetup() {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: list } = await supabase.auth.mfa.listFactors();
      const pending = (list?.all ?? []).filter((f) => f.status === "unverified");
      // Coming back from the authenticator app (the phone may reload the page):
      // keep the same setup code so the entry already added in the app still works.
      let saved: { id: string; qr: string; secret: string } | null = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(SETUP_KEY) ?? "null");
      } catch {}
      if (saved && pending.some((f) => f.id === saved!.id)) return setFactor(saved);
      // Otherwise remove any half-finished enrollment and start a fresh one.
      for (const f of pending) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
      if (error || !data) return setMsg("Could not start setup. Please sign in again.");
      const fresh = { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
      try {
        sessionStorage.setItem(SETUP_KEY, JSON.stringify(fresh));
      } catch {}
      setFactor(fresh);
    })();
  }, []);

  const verify = async () => {
    if (!factor) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) return setMsg("That code didn’t match. Use the newest 6-digit code for The Art of Connect in your authenticator app and try again.");
    try {
      sessionStorage.removeItem(SETUP_KEY);
    } catch {}
    window.location.href = "/admin";
  };

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Open an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or Authy).</li>
        <li>Scan this code, or enter the setup key.</li>
        <li>Come back here and type the 6-digit code it shows. It’s fine to switch apps — this setup code stays the same when you return.</li>
      </ol>
      {factor ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={factor.qr} alt="Authenticator QR code" className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
          <p className="break-all rounded-xl border border-line bg-ink-3 px-3 py-2 text-center font-mono text-xs">{factor.secret}</p>
        </>
      ) : (
        <p className="text-center text-sm text-muted">Preparing…</p>
      )}
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" className="field text-center tracking-[0.4em]" aria-label="Authenticator code" />
      {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
      <button type="button" onClick={verify} disabled={!factor || code.trim().length !== 6 || busy} className="btn btn-gold w-full">{busy ? "Verifying…" : "Turn on two-step verification"}</button>
    </div>
  );
}

/** Second step at sign-in for accounts with MFA. */
export function MfaVerify({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { data: list } = await supabase.auth.mfa.listFactors();
    const totp = list?.totp?.[0];
    if (!totp) {
      setBusy(false);
      return setMsg("No authenticator is set up for this account.");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: code.trim() });
    setBusy(false);
    if (error) return setMsg("That code didn’t match. Please try again.");
    window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  };
  return (
    <div className="space-y-4">
      <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" autoFocus className="field text-center tracking-[0.4em]" aria-label="Authenticator code" />
      {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
      <button type="button" onClick={verify} disabled={code.trim().length !== 6 || busy} className="btn btn-gold w-full">{busy ? "Verifying…" : "Verify"}</button>
    </div>
  );
}
