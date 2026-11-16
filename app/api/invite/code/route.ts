import { NextRequest, NextResponse } from "next/server";
import { findByCode, invitesConfigured, setSessionCookie } from "@/lib/invitations";
import { normalizeCode } from "@/lib/invite-codes";
import { clientKey, isBlocked, recordWrong } from "@/lib/invite-guard";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/**
 * Unlock this device by typing the 4-character household code. Wrong guesses
 * are counted per client (lib/invite-guard.ts); after 5 the client is blocked,
 * and while blocked even a correct code is refused.
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

  if (!invitesConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }

  const body = await req.json().catch(() => null);
  const code = normalizeCode(typeof body?.code === "string" ? body.code : "");
  // Same body for malformed, unknown and revoked, so nothing leaks which codes exist.
  const invalid = () => {
    recordWrong(key);
    return NextResponse.json({ error: "invalid-code" }, { status: 400, headers });
  };
  if (!code) return invalid();

  let row;
  try {
    row = await findByCode(code);
  } catch (err: any) {
    // An outage is not a wrong guess.
    console.error("[invite/code] load failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }
  if (!row || row.revoked) return invalid();

  const res = NextResponse.json({ ok: true }, { headers });
  await setSessionCookie(res, row.id);
  return res;
}
