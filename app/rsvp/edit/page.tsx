import { Suspense } from "react";
import EditRSVP from "@/components/EditRSVP";

export const metadata = { title: "Edit your RSVP · Jeffrey & Katie" };

export default function EditRSVPPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-rose-blush flex items-center justify-center">
          <p className="font-serif italic text-bark/50">Loading your RSVP…</p>
        </main>
      }
    >
      <EditRSVP />
    </Suspense>
  );
}
