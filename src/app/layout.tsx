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
  openGraph: { siteName: "The Art of Connect", type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  icons: { icon: "/icon-512.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#171512", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Lets CSS know JavaScript is running, so scroll animations never hide content without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <div className="aurora" />
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
