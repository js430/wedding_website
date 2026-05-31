import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
