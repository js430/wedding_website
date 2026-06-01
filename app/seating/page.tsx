import { cookies } from "next/headers";
import PasswordGate from "./PasswordGate";
import SeatingChart from "@/components/SeatingChart";

export const metadata = { title: "Seating Chart — Jeffrey & Katie" };

export default function SeatingPage() {
  const cookieStore = cookies();
  const authed = cookieStore.get("seating_auth")?.value === "true";

  if (!authed) return <PasswordGate />;
  return <SeatingChart />;
}
