import type { Metadata } from "next";
import { Playfair_Display, Lato, Tangerine } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
});

const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-tangerine",
});

// The palette is the design — keep dark-mode extensions (Dark Reader
// etc.) from recoloring it, and declare the site light-only.
export const viewport = {
  colorScheme: "light" as const,
};

export const metadata: Metadata = {
  other: { "darkreader-lock": "" },
  title: "Jeffrey & Katie — March 27, 2027",
  description: "Join us as we celebrate the wedding of Jeffrey Shi & Katie Shen in Charlottesville, VA.",
  openGraph: {
    title: "Jeffrey & Katie — March 27, 2027",
    description: "Join us as we celebrate the wedding of Jeffrey Shi & Katie Shen in Charlottesville, VA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${lato.variable} ${tangerine.variable}`}
    >
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
