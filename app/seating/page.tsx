import { cookies } from "next/headers";
import PasswordGate from "./PasswordGate";
import { SEATING_COOKIE, isSeatingAuthed } from "@/lib/seating-auth";
import SeatingChart from "@/components/SeatingChart";

export const metadata = { title: "Seating Chart — Katie & Jeffrey" };

// cookies() is async as of Next 15.
export default async function SeatingPage() {
  const cookieStore = await cookies();
  const authed = isSeatingAuthed(cookieStore.get(SEATING_COOKIE)?.value);

  if (!authed) return <PasswordGate />;
  return <SeatingChart />;
}
