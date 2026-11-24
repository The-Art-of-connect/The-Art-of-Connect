import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      { source: "/relationships", destination: "/love", permanent: true },
      { source: "/counseling", destination: "/life", permanent: true },
    ];
  },
};

export default nextConfig;
