import type { Metadata } from "next";
import RegistryPage from "@/components/RegistryPage";

export const metadata: Metadata = {
  title: "Registry — Katie & Jeffrey",
  description: "Wedding registry for Katie Shen & Jeffrey Shi, March 27, 2027",
};

export default function Registry() {
  return <RegistryPage />;
}
