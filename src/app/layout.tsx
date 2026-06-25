import type { Metadata } from "next";
import { Space_Grotesk, Tiro_Devanagari_Hindi } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Pehchaan — DHH Heardle",
  description:
    "Hear 1 second of a Seedhe Maut track. Guess the song in 5 tries. New track daily.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${devanagari.variable}`}>
      <body className="bg-ink text-paper font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
