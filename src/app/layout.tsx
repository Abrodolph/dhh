import type { Metadata } from "next";
import { Space_Grotesk, Tiro_Devanagari_Hindi, Saira_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
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

export const metadata: Metadata = {
  title: "DHH Heardle",
  description:
    "Hear 1 second of a Seedhe Maut track. Guess the song in 5 tries. New track daily.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${devanagari.variable} ${condensed.variable}`}>
      <body className="bg-ink text-paper font-sans antialiased min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
