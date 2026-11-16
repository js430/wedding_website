import { NextRequest, NextResponse } from "next/server";
import { findById, inviteUrl, invitesConfigured, siteOrigin } from "@/lib/invitations";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";

export const dynamic = "force-dynamic";

/** Who is this device? Used by the UI to show the household and their link. */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const id = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!id) return NextResponse.json({ error: "no-session" }, { status: 401, headers });

  if (!invitesConfigured()) {
    return NextResponse.json({ name: "", url: "", code: "", hasEmail: false }, { headers });
  }

  let row;
  try {
    row = await findById(id);
  } catch (err: any) {
    // Notion being down must never log anyone out.
    console.error("[invite/me] load failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }

  if (!row || row.revoked) {
    const res = NextResponse.json({ error: "revoked" }, { status: 401, headers });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
    return res;
  }

  return NextResponse.json(
    { name: row.name, url: await inviteUrl(siteOrigin(req), row), code: row.code, hasEmail: Boolean(row.email) },
    { headers },
  );
}
