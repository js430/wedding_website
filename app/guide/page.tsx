import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

export const metadata: Metadata = {
  title: "Charlottesville Guide — Jeffrey & Katie",
  description:
    "Where to stay, eat, and explore in Charlottesville for Jeffrey & Katie's wedding weekend.",
};

export default function Guide() {
  return <GuidePage />;
}
