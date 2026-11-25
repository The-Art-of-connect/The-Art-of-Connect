import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Only webinar promotional media from our own Supabase storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/webinar-media/**" }],
  },
  // Webinar flyers, logos and headshots (validated on the server, 5 MB each).
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  async redirects() {
    return [
      { source: "/relationships", destination: "/love", permanent: true },
      { source: "/counseling", destination: "/life", permanent: true },
      { source: "/privacy", destination: "/legal/privacy-policy", permanent: true },
      { source: "/terms", destination: "/legal/terms-of-service", permanent: true },
    ];
  },
};

export default nextConfig;
