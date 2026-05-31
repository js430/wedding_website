import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Wedding",
  description: "Join us as we celebrate our special day",
  openGraph: {
    title: "Our Wedding",
    description: "Join us as we celebrate our special day",
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
