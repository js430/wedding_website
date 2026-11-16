import { NextRequest, NextResponse } from "next/server";
import { findById, inviteUrl, siteOrigin } from "@/lib/invitations";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";
import { sendInviteEmail } from "@/lib/invite-email";
import { allow } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/** Email this device's household its own personal link. */
export async function POST(req: NextRequest) {
  const id = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!id) return NextResponse.json({ error: "no-session" }, { status: 401, headers });

  let row;
  try {
    row = await findById(id);
  } catch (err: any) {
    console.error("[invite/send-self] load failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }

  if (!row || row.revoked) {
    return NextResponse.json({ error: "revoked" }, { status: 401, headers });
  }
  if (!row.email) return NextResponse.json({ error: "no-email" }, { status: 400, headers });

  if (!allow(`invite-self:${row.id}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429, headers });
  }

  const result = await sendInviteEmail(row.email, row.name, await inviteUrl(siteOrigin(req), row), row.code);
  if (!result.ok) {
    return NextResponse.json({ error: "send-failed" }, { status: 502, headers });
  }
  return NextResponse.json({ ok: true }, { headers });
}
