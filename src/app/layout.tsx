import type { Metadata } from "next";
import { Archivo, Space_Mono, Tiro_Devanagari_Hindi, Saira_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Print-era grotesque for body copy — closer to a cassette label than Space Grotesk.
const body = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
});

// Tape-counter digits: player timer, countdown, scores.
const mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const devanagari = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari"],
  variable: "--font-devanagari",
});

// Bold condensed sans for the wordmark + display labels.
const condensed = Saira_Condensed({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-condensed",
});

const TITLE = "DHH Heardle";
const DESCRIPTION =
  "Hear 1 second of a Desi Hip Hop track. Guess the song in 5 tries. New puzzle daily — Seedhe Maut, DIVINE, KR$NA, Raftaar & more.";

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to the production domain so share previews
  // resolve absolute URLs (falls back to the Vercel deployment URL).
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: TITLE,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${devanagari.variable} ${condensed.variable}`}>
      <body className="bg-ink text-paper font-sans antialiased min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
