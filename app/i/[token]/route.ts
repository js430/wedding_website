import { NextRequest, NextResponse } from "next/server";
import { gateConfigured, linkTokenMatches } from "@/lib/invite-crypto";
import { setSessionCookie } from "@/lib/invite-session";
import { redirectTo } from "@/lib/origin";
import { clientKey, isBlocked, recordWrong } from "@/lib/invite-guard";

export const dynamic = "force-dynamic";

/**
 * Shared invite link: /i/<token>. The token is derived from the password and
 * secret (see linkToken); the link does not contain the password. Opening it
 * on any device signs that device in and shows the welcome page, which
 * displays the password. The link is reusable, so link-preview bots (iMessage,
 * WhatsApp) fetching this URL are harmless: they get a cookie they throw away.
 */

function redirect(_req: NextRequest, path: string): NextResponse {
  // Relative Location: req.url is the server's internal address behind Render.
  const res = redirectTo(path);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  if (!gateConfigured()) return redirect(req, "/");

  // Blocked clients are refused before any check, so links cannot bypass the box's limit.
  const key = clientKey(req);
  const block = isBlocked(key);
  if (block.blocked) return redirect(req, `/gate?blocked=${block.retryAfterSeconds}`);

  // An empty or wrongly formatted value counts as wrong.
  const { token } = await ctx.params;

  if (!token || !(await linkTokenMatches(token))) {
    recordWrong(key);
    return redirect(req, "/gate?invalid=1");
  }

  const res = redirect(req, "/welcome");
  await setSessionCookie(res);
  return res;
}
