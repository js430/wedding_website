import { cookies } from "next/headers";
import PasswordGate from "./PasswordGate";
import SeatingChart from "@/components/SeatingChart";

export const metadata = { title: "Seating Chart — Jeffrey & Katie" };

// cookies() is async as of Next 15.
export default async function SeatingPage() {
  const cookieStore = await cookies();
  const authed = cookieStore.get("seating_auth")?.value === "true";

  if (!authed) return <PasswordGate />;
  return <SeatingChart />;
}
