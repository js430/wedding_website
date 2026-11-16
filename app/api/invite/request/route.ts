import { NextRequest, NextResponse } from "next/server";
import { allow } from "@/lib/rate-limit";
import { findByEmail, invitesConfigured, inviteUrl, siteOrigin } from "@/lib/invitations";
import { sendInviteEmail } from "@/lib/invite-email";

export const dynamic = "force-dynamic";

/**
 * "Email me my personal link" — for a guest on a new device who can't find
 * their invitation. Matched on the email address on the guest list.
 *
 * The response is deliberately identical whether or not that email is on the
 * list (or revoked, or rate-limited, or Notion is down), so this cannot be
 * used to test who was invited.
 */

const WINDOW_MS  = 15 * 60 * 1000;
const PER_EMAIL  = 3;   // a guest retrying is fine; a script hammering one address is not
const PER_CLIENT = 10;  // across all addresses from one IP

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Same body for every outcome below, so nothing distinguishes a hit from a miss.
  const ok = () => NextResponse.json({ ok: true });

  if (!address || !address.includes("@")) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(`invite-ip:${ip}`, PER_CLIENT, WINDOW_MS) || !allow(`invite-em:${address}`, PER_EMAIL, WINDOW_MS)) {
    // Also a 200: a distinct 429 would leak that the address is being retried.
    console.warn("[Invite request] rate limited", { ip });
    return ok();
  }

  if (!invitesConfigured()) {
    console.warn("[Invite request] invites not configured — skipping");
    return ok();
  }

  try {
    const row = await findByEmail(address);
    if (!row || row.revoked || !row.email) {
      console.info("[Invite request] no active invitation for that address");
      return ok();
    }

    const url = await inviteUrl(siteOrigin(req), row);
    console.info("[Invite request] attempting send for", row.name);
    const sent = await sendInviteEmail(row.email, row.name, url, row.code);
    if (!sent.ok) {
      console.error("[Invite request] email failed:", sent.error);
    }
  } catch (err: any) {
    // Never surface the failure: the response must not vary by outcome.
    console.error("[Invite request] failed:", err?.message ?? err);
  }

  return ok();
}
