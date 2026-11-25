import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theartofconnect.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/app", "/api", "/auth", "/join", "/sign-in"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
