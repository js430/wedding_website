import type { Metadata } from "next";
import FAQPage from "@/components/FAQPage";

export const metadata: Metadata = {
  title: "FAQ — Jeffrey & Katie",
  description: "Frequently asked questions about the wedding of Jeffrey Shi & Katie Shen.",
};

export default function FAQ() {
  return <FAQPage />;
}
