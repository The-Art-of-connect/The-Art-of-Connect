import { ImageResponse } from "next/og";
import { formatWhen, getPublicWebinar, mediaUrl } from "@/lib/webinars";

/**
 * Branded promotional graphic for an approved webinar, in three formats:
 * square (1080×1080), portrait (1080×1920) and landscape (1200×630, also the
 * social preview). Hosts may use their own flyer instead of a template; every
 * graphic carries a tasteful "Hosted on The Art of Connect".
 */
const SIZES = { square: [1080, 1080], portrait: [1080, 1920], landscape: [1200, 630] } as const;
const THEMES = {
  espresso: { bg: "#211C18", fg: "#F8F3E9", accent: "#C5A572", soft: "#E8D9C5" },
  burgundy: { bg: "#5A1628", fg: "#F8F3E9", accent: "#D9BC86", soft: "#E8D9C5" },
  cream: { bg: "#F8F3E9", fg: "#211C18", accent: "#8A6A33", soft: "#5A4A3A" },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getPublicWebinar(id);
  if (!w || w.status !== "approved") return new Response("Not found", { status: 404 });
  const format = (new URL(request.url).searchParams.get("format") ?? "landscape") as keyof typeof SIZES;
  const [width, height] = SIZES[format] ?? SIZES.landscape;
  const t = THEMES[(w.use_template as keyof typeof THEMES) ?? "espresso"] ?? THEMES.espresso;
  const { date, time } = formatWhen(w.starts_at, w.time_zone);
  const promo = mediaUrl(w.promo_image_path);
  const headshot = mediaUrl(w.headshot_path);
  const s = width / 1080;
  const tall = format === "portrait";
  const wide = format === "landscape";

  if (w.use_template === "own_flyer" && promo) {
    return new ImageResponse(
      (
        <div style={{ width, height, display: "flex", flexDirection: "column", background: "#211C18" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={promo} alt="" width={width} height={height - 70 * s} style={{ objectFit: "contain", width, height: height - 70 * s }} />
          <div style={{ height: 70 * s, display: "flex", alignItems: "center", justifyContent: "center", color: "#C5A572", fontSize: 24 * s, letterSpacing: 4 * s }}>
            HOSTED ON THE ART OF CONNECT · THEARTOFCONNECT.COM
          </div>
        </div>
      ),
      { width, height, headers: { "Content-Disposition": `attachment; filename="webinar-${format}.png"` } },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: wide ? "row" : "column", background: t.bg, color: t.fg, fontFamily: "serif", border: `${10 * s}px solid ${t.accent}` }}>
        {promo && !wide && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={promo} alt="" width={width} height={tall ? 820 * s : 430 * s} style={{ objectFit: "cover", width: "100%", height: tall ? 820 * s : 430 * s }} />
        )}
        {promo && wide && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={promo} alt="" width={520} height={height} style={{ objectFit: "cover", width: 520, height: "100%" }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${40 * s}px ${60 * s}px`, textAlign: "center" }}>
          <div style={{ color: t.accent, fontSize: (wide ? 20 : 28) * s, letterSpacing: 6 * s, display: "flex" }}>THE PROFESSIONAL SOCIETY PRESENTS</div>
          <div style={{ fontSize: (wide ? 50 : tall ? 86 : 72) * s, lineHeight: 1.1, marginTop: 24 * s, display: "flex", textAlign: "center" }}>{w.title}</div>
          <div style={{ color: t.accent, fontSize: (wide ? 22 : 32) * s, letterSpacing: 4 * s, marginTop: 24 * s, display: "flex" }}>LIVE BUSINESS WEBINAR</div>
          <div style={{ width: 160 * s, height: 2, background: t.accent, margin: `${28 * s}px 0`, display: "flex" }} />
          <div style={{ fontSize: (wide ? 26 : 38) * s, display: "flex" }}>{date}</div>
          <div style={{ fontSize: (wide ? 26 : 38) * s, marginTop: 6 * s, display: "flex" }}>{time}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 32 * s }}>
            {headshot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headshot} alt="" width={90 * s} height={90 * s} style={{ borderRadius: 999, objectFit: "cover", marginRight: 18 * s, border: `2px solid ${t.accent}` }} />
            )}
            <div style={{ fontSize: (wide ? 24 : 34) * s, color: t.soft, display: "flex" }}>with {w.host_display_name}</div>
          </div>
          <div style={{ marginTop: 40 * s, padding: `${18 * s}px ${48 * s}px`, background: t.accent, color: t.bg === "#F8F3E9" ? "#F8F3E9" : "#211C18", borderRadius: 999, fontSize: (wide ? 24 : 34) * s, display: "flex" }}>Register to Attend</div>
          <div style={{ marginTop: 34 * s, color: t.accent, fontSize: (wide ? 16 : 22) * s, letterSpacing: 4 * s, display: "flex" }}>HOSTED ON THE ART OF CONNECT · THEARTOFCONNECT.COM</div>
        </div>
      </div>
    ),
    { width, height, headers: { "Content-Disposition": `inline; filename="webinar-${format}.png"`, "Cache-Control": "public, max-age=600" } },
  );
}
