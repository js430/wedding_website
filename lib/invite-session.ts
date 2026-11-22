import type { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_EXPIRES, linkToken, signSession } from "@/lib/invite-crypto";
import { publicOrigin } from "@/lib/origin";

/** Node route-handler helpers for the shared-password gate. */

/** Set the long-lived device cookie that lets this browser in. */
export async function setSessionCookie(res: NextResponse): Promise<void> {
  res.cookies.set(SESSION_COOKIE, await signSession(Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: SESSION_EXPIRES,
  });
}

/** The site's public address (see lib/origin.ts for why not req.nextUrl.origin). */
export function siteOrigin(req: NextRequest): string {
  return publicOrigin(req);
}

/** What guests should type into the address bar: the host without "www.". */
export function displayHost(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, "");
  } catch {
    return origin.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

/** The link the couple texts to everyone (carries a derived token, not the password). */
export async function inviteLink(origin: string): Promise<string> {
  const token = await linkToken();
  return token ? `${origin}/i/${token}` : "";
}
