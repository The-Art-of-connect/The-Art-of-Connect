"use client";
import { useState, useTransition } from "react";
import { registerExaWebhook, verifyConnections, type RegisterResult, type VerifyResult } from "@/app/actions/intel-admin";

const LABEL: Record<string, string> = { configured: "Configured", not_configured: "Not set", unexpected_format: "Unexpected format" };

/** Owner Portal: verify provider connections and register the Exa webhook (secret shown once, in this browser only). */
export function IntelConnections() {
  const [v, setV] = useState<VerifyResult | null>(null);
  const [reg, setReg] = useState<RegisterResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [replace, setReplace] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <section className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">Verify connections</p><p className="text-sm text-muted">Checks each key with a free, read-only request. No research runs and nothing is billed. Key values are never shown.</p></div>
          <button className="btn btn-gold btn-sm" disabled={pending} onClick={() => start(async () => { setV(await verifyConnections()); })}>{pending ? "Checking…" : "Verify now"}</button>
        </div>
        {v && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {([["Parallel", v.parallel, [["PARALLEL_API_KEY", v.config.parallelKey], ["PARALLEL_WEBHOOK_SECRET", v.config.parallelWebhookSecret]]],
               ["Exa", v.exa, [["EXA_API_KEY", v.config.exaKey], ["EXA_WEBHOOK_SECRET", v.config.exaWebhookSecret]]]] as const).map(([name, c, keys]) => (
              <div key={name} className="rounded-2xl border border-line p-4 text-sm">
                <p className="flex items-center justify-between"><span className="display text-xl">{name}</span><span className={`chip ${c.ok ? "chip-live" : "chip-danger"}`}>{c.ok ? "Connected" : "Not connected"}</span></p>
                <p className="mt-2 text-muted">{c.detail}{c.status ? ` (HTTP ${c.status})` : ""}</p>
                <ul className="mt-2 space-y-1">{keys.map(([k, s]) => <li key={k} className="flex justify-between gap-2"><code className="text-xs">{k}</code><span className={s === "configured" ? "text-success" : "text-gold"}>{LABEL[s]}</span></li>)}</ul>
              </div>
            ))}
            <div className="md:col-span-2 text-sm">
              <p className="text-muted">Registered Exa webhooks: {v.exa.hooks.length ? v.exa.hooks.map((h) => `${h.url} (${h.status || "status unknown"})`).join("; ") : "none yet"}.</p>
              <p className="mt-1 text-xs text-faint">Checked {new Date(v.checkedAt).toLocaleString()}. This site's Exa webhook address: <code>{v.webhookUrl}</code></p>
            </div>
          </div>
        )}
      </section>

      <section className="glass p-6">
        <p className="font-semibold">Register the Exa webhook</p>
        <p className="mt-1 text-sm text-muted">Exa shows the signing secret <strong>only once</strong>. It appears below in this browser only: it is not saved, logged or sent anywhere else, and Peace never sees it. Have Netlify open, ready to add it as <code>EXA_WEBHOOK_SECRET</code> (marked secret, Functions scope).</p>
        {!reg?.ok && (
          <div className="mt-4 space-y-2 text-sm">
            <label className="flex gap-2"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I&apos;m ready to copy the secret into Netlify now.</label>
            <label className="flex gap-2"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />Replace an existing webhook for this site (its old secret stops working).</label>
            <button className="btn btn-gold btn-sm" disabled={pending || !confirm} onClick={() => start(async () => { setReg(await registerExaWebhook(confirm, replace)); })}>{pending ? "Registering…" : "Register webhook"}</button>
            {reg && !reg.ok && <p className="text-danger" role="status">{reg.message}</p>}
          </div>
        )}
        {reg?.ok && (
          <div className="mt-4 space-y-3 rounded-2xl border border-[var(--champagne)] p-4 text-sm">
            <p className="text-success">Webhook registered for <code>{reg.url}</code>.</p>
            <p className="font-semibold">Your EXA_WEBHOOK_SECRET (shown once):</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--hover-bg)] px-3 py-2">{reg.secret}</code>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await navigator.clipboard.writeText(reg.secret); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              <li>In Netlify: Site configuration → Environment variables → Add a variable.</li>
              <li>Key <code>EXA_WEBHOOK_SECRET</code>, paste the value, mark it <strong>secret</strong>, scope Functions, all deploy contexts.</li>
              <li>Trigger a new deploy so the site can read it, then return here and choose Verify now.</li>
            </ol>
            <button className="text-xs text-muted underline" onClick={() => setReg(null)}>I&apos;ve saved it. Hide the secret</button>
          </div>
        )}
      </section>
    </div>
  );
}
