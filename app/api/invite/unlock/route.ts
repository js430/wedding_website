import { NextRequest, NextResponse } from "next/server";
import { gateConfigured, passwordMatches } from "@/lib/invite-crypto";
import { setSessionCookie } from "@/lib/invite-session";
import { clientKey, isBlocked, recordWrong } from "@/lib/invite-guard";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/**
 * Unlock this device by typing the shared password. Wrong guesses are counted
 * per client (lib/invite-guard.ts); after 5 the client is blocked, and while
 * blocked even the correct password is refused.
 */
export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const block = isBlocked(key);
  if (block.blocked) {
    return NextResponse.json(
      { error: "blocked", retryAfterSeconds: block.retryAfterSeconds },
      { status: 429, headers: { ...headers, "Retry-After": String(block.retryAfterSeconds) } },
    );
  }

  if (!gateConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }

  const body = await req.json().catch(() => null);
  const input = typeof body?.password === "string" ? body.password : "";
  if (!(await passwordMatches(input))) {
    recordWrong(key);
    return NextResponse.json({ error: "wrong-password" }, { status: 400, headers });
  }

  const res = NextResponse.json({ ok: true }, { headers });
  await setSessionCookie(res);
  return res;
}
