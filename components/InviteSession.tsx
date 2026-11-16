"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useInvite } from "@/lib/use-invite";

/**
 * Sends a device whose household was revoked back to the gate. Does nothing
 * for "none" (the site may simply be open) or "unavailable" (a Notion outage
 * must never log anyone out). Renders nothing.
 */
export default function InviteSession() {
  const pathname = usePathname() ?? "";
  const { status } = useInvite();
  const skip =
    pathname === "/gate" ||
    pathname.startsWith("/gate/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  useEffect(() => {
    if (skip) return;
    if (status === "revoked") window.location.replace("/gate?invalid=1");
  }, [status, skip]);

  return null;
}
