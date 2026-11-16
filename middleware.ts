import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";

/**
 * Invite gate. Enforced only when INVITE_GATE is exactly "on"; otherwise the
 * site behaves as if this file did not exist. Only the signed cookie is
 * checked here (Edge-safe). It is bound to SITE_PASSWORD, so changing the
 * password signs every device out.
 */

const PUBLIC_PREFIXES = [
  // The gate, the shared link that sets the cookie, and the password box.
  "/gate",
  "/i/",
  "/api/invite/unlock",
  // Edit links, resend and calendar files carry their own auth or are harmless,
  // and arrive from email on devices that have no cookie yet.
  "/rsvp/edit",
  "/api/rsvp/edit",
  "/api/rsvp/resend",
  "/api/calendar",
  // Analytics beacon and diagnostics: no guest data, must work before entry.
  "/api/analytics",
  "/api/diagnostics",
  // Admin and seating have their own passwords.
  "/admin",
  "/seating",
  "/api/seating",
  "/api/meals",
  // Share-preview assets: link-preview bots carry no cookie.
  "/opengraph-image",
  "/icon.png",
  "/apple-icon.png",
  "/robots.txt",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => {
    if (p.endsWith("/")) return pathname.startsWith(p);
    // "/admin" matches "/admin" and "/admin/...", never "/administrator".
    // "/opengraph-image" also needs its extension variants (.jpg).
    if (p === "/opengraph-image") return pathname === p || pathname.startsWith(p + ".") || pathname.startsWith(p + "/");
    return pathname === p || pathname.startsWith(p + "/");
  });
}

export async function middleware(req: NextRequest) {
  if (process.env.INVITE_GATE !== "on") return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "invite-required" }, { status: 401 });
  }
  const url = new URL(`/gate?next=${encodeURIComponent(pathname + search)}`, req.url);
  return NextResponse.redirect(url);
}

// Everything except build assets: photos and /_next/image stay gated.
export const config = {
  matcher: ["/((?!_next/static).*)"],
};
