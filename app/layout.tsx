import type { Metadata } from "next";
import { Playfair_Display, Lato, Tangerine } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import PageView from "@/components/PageView";
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
  twitter: {
    card: "summary_large_image",
    title: "Jeffrey & Katie — March 27, 2027",
    description: "Join us as we celebrate the wedding of Jeffrey Shi & Katie Shen in Charlottesville, VA.",
  },
  // Keep the wedding out of search results: the site carries the venue, the
  // date and, nearer the day, guest names and table assignments.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
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
        <PageView />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
