import type { Metadata, Viewport } from "next";
// Fonts are bundled with the site (no third-party font requests).
import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/manrope/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://theartofconnect.com"),
  title: { default: "The Art of Connect — Relationships, Business & Counseling", template: "%s · The Art of Connect" },
  description:
    "A private membership for the relationships that shape a life: intentional dating, purposeful professional networking, and confidential access to verified counselors.",
  openGraph: { siteName: "The Art of Connect", type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#07070b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aurora" />
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
