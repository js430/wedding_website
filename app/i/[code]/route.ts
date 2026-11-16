import { NextRequest, NextResponse } from "next/server";
import { findByCode, invitesConfigured, setSessionCookie } from "@/lib/invitations";
import { normalizeCode } from "@/lib/invite-codes";
import { clientKey, isBlocked, recordWrong } from "@/lib/invite-guard";

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

  // Blocked clients are refused before any lookup, so links cannot bypass the box's limit.
  const key = clientKey(req);
  if (isBlocked(key).blocked) return redirect(req, "/gate?blocked=1");

  const { code: raw } = await ctx.params;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // malformed escape: normalizeCode will reject it
  }
  const code = normalizeCode(decoded);
  const wrong = () => {
    recordWrong(key);
    return redirect(req, "/gate?invalid=1");
  };
  if (!code) return wrong();

  let row;
  try {
    row = await findByCode(code);
  } catch (err: any) {
    // A failed load is not "not invited": send them to a retryable error, no cookie.
    console.error("[invite] load failed:", err?.message ?? err);
    return redirect(req, "/gate?error=1");
  }
  if (!row || row.revoked) return wrong();

  const res = redirect(req, "/");
  await setSessionCookie(res, row.id);
  return res;
}
