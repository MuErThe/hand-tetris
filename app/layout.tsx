import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Fraunces } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { CATALOGUE } from "@/lib/games/registry";
import "./globals.css";

// preload disabled — the boot placeholder doesn't render any text, so the
// link-preload tags fire a "preloaded but not used within a few seconds"
// warning. Fonts still load lazily on first use.
// Display face. Technical but rounded — calm without going generic, and a
// clear relative of the mono used for data. Replaced the pixel face when the
// arcade skin came off; Focalism itself is unchanged.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

// Proportional display serif for Kern Combat — expressive shapes with real
// kerning pairs (AV, To, LT) make the spacing exercise legible. Self-hosted at
// build time, so no CSP change.
const fraunces = Fraunces({
  variable: "--font-kern",
  subsets: ["latin"],
  weight: ["600"],
  preload: false,
});

const SITE_URL = "https://squint.mdzabeeh.com/";
const TITLE = "Squint — train the eye you trust";
const DESCRIPTION =
  "Five-minute games that train a designer's instincts: eyeballing proportion, kerning, colour matching, the Thirty Circles divergent-thinking sprint, and gesture-controlled Tetris.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Squint",
  },
  description: DESCRIPTION,
  applicationName: "Squint",
  authors: [{ name: "Zabeeh" }],
  alternates: { canonical: "./" },
  keywords: [
    "squint",
    "design games",
    "designer training",
    "kerning game",
    "colour matching",
    "divergent thinking",
    "thirty circles",
    "hand tetris",
    "gesture game",
    "mediapipe",
  ],
  referrer: "strict-origin-when-cross-origin",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Squint",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "og-image.png",
        width: 1200,
        height: 630,
        alt: "Squint — five-minute games that train a designer's eye",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["og-image.png"],
  },
  icons: {
    icon: [{ url: "icon.svg", type: "image/svg+xml" }],
  },
};

// Browser chrome follows the OS preference. It intentionally doesn't track an
// explicit in-app override — these are static <meta> tags and the mismatch is
// confined to the address bar.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0a14" },
    { media: "(prefers-color-scheme: light)", color: "#ececeb" },
  ],
};

// Content-Security-Policy ships as a real response header via vercel.json
// (which also lets us enforce frame-ancestors — impossible from a meta tag).
// Keeping it out of the markup also means `next dev` isn't subject to it,
// so development hot-reload (which needs eval) works normally.

// Structured data for search + answer engines: the site as a free web app,
// with each game enumerated so engines can cite them individually.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "Squint",
      description: DESCRIPTION,
      publisher: { "@type": "Person", name: "Zabeeh" },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}#app`,
      name: "Squint",
      url: SITE_URL,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      description:
        "A free arcade of five-minute games that train a designer's instincts — visual accuracy, kerning, colour perception and divergent thinking — with teach-back feedback, local progress tracking and daily warm-up streaks.",
      featureList: [
        ...CATALOGUE.map((g) => `${g.name} — ${g.blurb}`),
        "Daily Warm-Up — four games sampled daily with streak tracking",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the boot script stamps data-theme on <html>
    // before React hydrates, so the server markup never matches.
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="h-full flex flex-col overflow-hidden"
        suppressHydrationWarning
      >
        {/* First thing in the document: resolve the theme before anything
            paints. Nothing renders above it, so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
