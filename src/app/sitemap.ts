import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theartofconnect.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { path: "/", priority: 1 },
    { path: "/membership", priority: 0.9 },
    { path: "/business", priority: 0.8 },
    { path: "/life", priority: 0.8 },
    { path: "/love", priority: 0.8 },
    { path: "/professionals", priority: 0.7 },
    { path: "/legal", priority: 0.3 },
  ].map(({ path, priority }) => ({ url: `${base}${path}`, lastModified: now, changeFrequency: "weekly", priority }));
}
