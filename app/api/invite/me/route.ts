import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, gateConfigured, verifySession } from "@/lib/invite-crypto";
import { displayHost, inviteLink, siteOrigin } from "@/lib/invite-session";

export const dynamic = "force-dynamic";

/** For a signed-in device: the password, the host to type, and the full link. */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!gateConfigured()) {
    return NextResponse.json({ password: "", host: "", link: "" }, { headers });
  }
  if (!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "no-session" }, { status: 401, headers });
  }
  const origin = siteOrigin(req);
  return NextResponse.json(
    {
      password: (process.env.SITE_PASSWORD ?? "").trim(),
      host: displayHost(origin),
      link: await inviteLink(origin),
    },
    { headers },
  );
}
