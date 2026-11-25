import type { Metadata, Viewport } from "next";
// Fonts are bundled with the site (no third-party font requests).
import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/manrope/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://theartofconnect.com"),
  title: { default: "The Art of Connect — In Business. In Life. In Love. | Adults 40+", template: "%s · The Art of Connect" },
  description:
    "Life after 40. Connection with intention. A premium membership for adults 40 and older seeking meaningful personal, professional and romantic connections.",
  applicationName: "The Art of Connect",
  keywords: ["adults over 40", "meaningful connections", "intentional dating over 40", "professional networking", "personal growth", "relationship coaching", "life after 40"],
  alternates: { canonical: "/" },
  twitter: { card: "summary_large_image", images: ["/og/home.jpg"] },
  robots: { index: true, follow: true },
  openGraph: { siteName: "The Art of Connect", type: "website", locale: "en_US", images: [{ url: "/og/home.jpg", width: 1200, height: 630, alt: "The Art of Connect — Life after 40. Connection with intention." }] },
  icons: { icon: "/icon-512.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#211C18", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Lets CSS know JavaScript is running, so scroll animations never hide content without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
