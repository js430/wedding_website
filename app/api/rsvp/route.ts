import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, attending, plusOne, plusOneName, dietary, message } = body;

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.warn("[RSVP] NOTION_TOKEN or NOTION_DATABASE_ID not set — logging only");
    console.log("[RSVP]", new Date().toISOString(), body);
    return NextResponse.json({ ok: true });
  }

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: name ?? "" } }],
      },
      Email: {
        email: email ?? null,
      },
      Attending: {
        select: { name: attending === "yes" ? "Yes" : "No" },
      },
      "+1": {
        select: { name: plusOne === "yes" ? "Yes" : "No" },
      },
      "Guest Name": {
        rich_text: [{ text: { content: plusOneName ?? "" } }],
      },
      "Dietary Restrictions": {
        rich_text: [{ text: { content: dietary ?? "" } }],
      },
      Message: {
        rich_text: [{ text: { content: message ?? "" } }],
      },
      "Submitted At": {
        date: { start: new Date().toISOString() },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
