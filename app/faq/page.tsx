import type { Metadata } from "next";
import FAQPage from "@/components/FAQPage";

export const metadata: Metadata = {
  title: "FAQ — Katie & Jeffrey",
  description: "Frequently asked questions about the wedding of Katie Shen & Jeffrey Shi.",
};

export default function FAQ() {
  return <FAQPage />;
}
