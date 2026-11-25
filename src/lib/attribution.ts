/**
 * Privacy-conscious campaign attribution: first-party cookies only, no
 * third-party trackers, no personal data. Records which campaign (UTM tags)
 * first brought a visitor and the most recent referral code they used.
 */
export const ATTR_COOKIE = "aoc_attr";
export const REF_COOKIE = "aoc_ref";
export const ATTR_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const clean = (v: string | null) => (v ?? "").replace(/[^A-Za-z0-9_.\-+ ]/g, "").trim().slice(0, 80);

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & { landing?: string; at?: string };

export function attributionFromUrl(url: URL): Attribution | null {
  const out: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = clean(url.searchParams.get(k));
    if (v) out[k] = v;
  }
  if (!Object.keys(out).length) return null;
  out.landing = url.pathname.slice(0, 120);
  out.at = new Date().toISOString();
  return out;
}

export function referralFromUrl(url: URL) {
  const v = clean(url.searchParams.get("ref")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.length >= 4 && v.length <= 20 ? v : null;
}

export function parseAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    const out: Attribution = {};
    for (const k of [...UTM_KEYS, "landing", "at"] as const) if (typeof o[k] === "string") out[k] = clean(o[k]) || o[k].slice(0, 120);
    return out;
  } catch {
    return {};
  }
}
