import { NextRequest, NextResponse } from "next/server";
import {
  invitesConfigured,
  loadInvitations,
  findById,
  siteOrigin,
  inviteUrl,
  markLinkSent,
  type Invitation,
} from "@/lib/invitations";
import { sendInviteEmail } from "@/lib/invite-email";

export const dynamic = "force-dynamic";

/** Pause between bulk sends: the email provider rate-limits per second. */
const SEND_GAP_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Same ADMIN_PASSWORD check as /api/meals; returns an error response or null. */
function guard(req: NextRequest): NextResponse | null {
  const given = req.headers.get("x-admin-password") ?? "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  if (given !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Households that should get a first email: has one, not revoked, never sent. */
const isUnsent = (r: Invitation) => Boolean(r.email) && !r.revoked && !r.linkSent;

/** Email one household their link and stamp "Link Sent". */
async function sendOne(req: NextRequest, row: Invitation): Promise<{ ok: boolean; error?: string }> {
  const url = await inviteUrl(siteOrigin(req), row);
  const sent = await sendInviteEmail(row.email, row.name, url, row.code);
  if (!sent.ok) return sent;
  try {
    await markLinkSent(row.id);
  } catch (err: any) {
    // The email went out; only the bookkeeping failed.
    console.error("[Invite admin] Sent but could not stamp Link Sent:", err);
    return { ok: false, error: "Email sent, but Link Sent could not be saved" };
  }
  return { ok: true };
}

/** GET — every household with its link, behind the admin password. */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const gateOn = process.env.INVITE_GATE === "on";
  if (!invitesConfigured()) {
    return NextResponse.json({ configured: false, gateOn, invites: [] });
  }

  try {
    const rows = await loadInvitations({ fresh: true });
    const origin = siteOrigin(req);
    const invites = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        revoked: r.revoked,
        linkSent: r.linkSent,
        code: r.code,
        url: await inviteUrl(origin, r),
      })),
    );
    return NextResponse.json({ configured: true, gateOn, site: origin, invites });
  } catch (err) {
    console.error("[Invite admin] Failed to load invitations:", err);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

/** POST — email one household, or everyone not yet emailed. */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  if (!invitesConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  try {
    if (action === "send") {
      const row = typeof body.id === "string" ? await findById(body.id) : null;
      if (!row) return NextResponse.json({ error: "not-found" }, { status: 404 });
      if (row.revoked) return NextResponse.json({ error: "revoked" }, { status: 400 });
      if (!row.email) return NextResponse.json({ error: "no-email" }, { status: 400 });

      const result = await sendOne(req, row);
      if (!result.ok) {
        console.error("[Invite admin] Send failed:", row.name, result.error);
        return NextResponse.json({ error: "send-failed", detail: result.error }, { status: 502 });
      }
      const fresh = await findById(row.id);
      return NextResponse.json({ ok: true, linkSent: fresh?.linkSent || new Date().toISOString() });
    }

    if (action === "send-unsent") {
      const expected = body.expectedCount;
      const unsent = (await loadInvitations({ fresh: true })).filter(isUnsent);
      if (typeof expected !== "number" || unsent.length !== expected) {
        return NextResponse.json({ error: "count-changed", count: unsent.length }, { status: 409 });
      }

      let sent = 0;
      const failed: { name: string; error: string }[] = [];
      for (let i = 0; i < unsent.length; i++) {
        if (i > 0) await sleep(SEND_GAP_MS);
        const result = await sendOne(req, unsent[i]);
        if (result.ok) sent++;
        else failed.push({ name: unsent[i].name, error: result.error ?? "Unknown error" });
      }
      return NextResponse.json({ sent, failed });
    }

    return NextResponse.json({ error: "bad-action" }, { status: 400 });
  } catch (err) {
    console.error("[Invite admin] Request failed:", err);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}
