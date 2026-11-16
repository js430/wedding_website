import { NextRequest, NextResponse } from "next/server";
import { findByCode, invitesConfigured, loadInvitations } from "@/lib/invitations";
import { SESSION_COOKIE, SESSION_EXPIRES, signSession } from "@/lib/invite-crypto";

export const dynamic = "force-dynamic";

/**
 * Personal invite link: /i/<code>. Opening it on any device sets a long-lived
 * cookie there. The link is reusable (any number of devices, any number of
 * times), so link-preview bots (iMessage, WhatsApp) fetching this URL is
 * harmless: they get a cookie they throw away.
 */

function redirect(req: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  if (!invitesConfigured()) return redirect(req, "/");

  const { code } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) return redirect(req, "/gate?invalid=1");

  let row;
  try {
    await loadInvitations();
    row = await findByCode(code);
  } catch (err: any) {
    // A failed load is not "not invited": send them to a retryable error, no cookie.
    console.error("[invite] load failed:", err?.message ?? err);
    return redirect(req, "/gate?error=1");
  }
  if (!row || row.revoked) return redirect(req, "/gate?invalid=1");

  const res = redirect(req, "/");
  res.cookies.set(SESSION_COOKIE, await signSession(row.id, Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: SESSION_EXPIRES,
  });
  return res;
}
