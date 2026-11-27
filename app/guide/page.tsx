import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

export const metadata: Metadata = {
  title: "Guide to Charlottesville — Katie & Jeffrey",
  description:
    "Where to stay, eat, and explore in Charlottesville for Katie & Jeffrey's wedding weekend.",
};

export default function Guide() {
  return <GuidePage />;
}
