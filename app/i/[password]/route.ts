import { NextRequest, NextResponse } from "next/server";
import { gateConfigured, passwordMatches } from "@/lib/invite-crypto";
import { setSessionCookie } from "@/lib/invite-session";
import { clientKey, isBlocked, recordWrong } from "@/lib/invite-guard";

export const dynamic = "force-dynamic";

/**
 * Shared invite link: /i/<password>. Opening it on any device signs that
 * device in and shows the welcome page, which displays the password. The link
 * is reusable, so link-preview bots (iMessage, WhatsApp) fetching this URL are
 * harmless: they get a cookie they throw away.
 */

function redirect(req: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, req.url));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ password: string }> }) {
  if (!gateConfigured()) return redirect(req, "/");

  // Blocked clients are refused before any check, so links cannot bypass the box's limit.
  const key = clientKey(req);
  if (isBlocked(key).blocked) return redirect(req, "/gate?blocked=1");

  // Next already percent-decodes route params; decoding again would break
  // passwords containing "%". An empty value counts as wrong.
  const { password } = await ctx.params;

  if (!password || !(await passwordMatches(password))) {
    recordWrong(key);
    return redirect(req, "/gate?invalid=1");
  }

  const res = redirect(req, "/welcome");
  await setSessionCookie(res);
  return res;
}
