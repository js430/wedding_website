import type { Metadata } from "next";
import RegistryPage from "@/components/RegistryPage";

export const metadata: Metadata = {
  title: "Registry — Jeffrey & Katie",
  description: "Wedding registry for Jeffrey Shi & Katie Shen, March 27, 2027",
};

export default function Registry() {
  return <RegistryPage />;
}
