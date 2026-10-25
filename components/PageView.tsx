"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reports each page view to our own endpoint. No third party, no cookies. */
export default function PageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Never block rendering on this, and never surface a failure.
    const body = JSON.stringify({ path: pathname });
    fetch("/api/analytics", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
