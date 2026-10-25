import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { verifyEditToken, editingClosed, formatDeadline } from "@/lib/rsvp-token";

export const dynamic = "force-dynamic";

function notionClient() {
  return new Client({ auth: process.env.NOTION_TOKEN });
}

/** Pull the RSVP fields the guest is allowed to see and change. */
function readRsvp(page: any) {
  const p = page.properties;
  return {
    name:        p.Name?.title?.[0]?.plain_text ?? "",
    email:       p.Email?.email ?? "",
    attending:   p.Attending?.select?.name === "Yes" ? "yes" : "no",
    plusOne:     p["+1"]?.select?.name === "Yes" ? "yes" : "no",
    plusOneName: p["Guest Name"]?.rich_text?.[0]?.plain_text ?? "",
    dietary:     p["Dietary Restrictions"]?.rich_text?.[0]?.plain_text ?? "",
    message:     p.Message?.rich_text?.[0]?.plain_text ?? "",
  };
}

/** GET /api/rsvp/edit?token=… — current answers behind a signed token. */
export async function GET(req: NextRequest) {
  const token  = req.nextUrl.searchParams.get("token") ?? "";
  const pageId = verifyEditToken(token);

  if (!pageId) {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  try {
    const page = await notionClient().pages.retrieve({ page_id: pageId });
    return NextResponse.json({
      rsvp:     readRsvp(page),
      closed:   editingClosed(),
      deadline: formatDeadline(),
    });
  } catch (err: any) {
    console.error("[RSVP edit] retrieve failed:", err?.message ?? err);
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
}

/** POST /api/rsvp/edit — save changes, until the deadline passes. */
export async function POST(req: NextRequest) {
  const { token, attending, plusOne, plusOneName, dietary, message } =
    await req.json();

  const pageId = verifyEditToken(token ?? "");
  if (!pageId) {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  // The deadline is enforced here, not in the browser, so an old open tab
  // or a hand-made request cannot save after it passes.
  if (editingClosed()) {
    return NextResponse.json(
      { error: "closed", deadline: formatDeadline() },
      { status: 403 }
    );
  }

  const attendingYes = attending === "yes";

  try {
    await notionClient().pages.update({
      page_id: pageId,
      properties: {
        Attending:              { select:    { name: attendingYes ? "Yes" : "No" } },
        "+1":                   { select:    { name: attendingYes && plusOne === "yes" ? "Yes" : "No" } },
        "Guest Name":           { rich_text: [{ text: { content: attendingYes ? (plusOneName ?? "") : "" } }] },
        "Dietary Restrictions": { rich_text: [{ text: { content: attendingYes ? (dietary ?? "") : "" } }] },
        Message:                { rich_text: [{ text: { content: message ?? "" } }] },
        "Submitted At":         { date:      { start: new Date().toISOString() } },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[RSVP edit] update failed:", err?.message ?? err);
    return NextResponse.json({ error: "update-failed" }, { status: 500 });
  }
}
