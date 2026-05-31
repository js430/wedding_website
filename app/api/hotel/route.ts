import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ihgNumber, firstName, lastName, guests, roomType, arrivalDate, departureDate, email } = body;

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_HOTEL_DATABASE_ID) {
    console.warn("[HOTEL] NOTION_TOKEN or NOTION_HOTEL_DATABASE_ID not set — logging only");
    console.log("[HOTEL]", new Date().toISOString(), body);
    return NextResponse.json({ ok: true });
  }

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_HOTEL_DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: `${firstName ?? ""} ${lastName ?? ""}`.trim() } }],
      },
      "IHG Rewards #": {
        rich_text: [{ text: { content: ihgNumber ?? "" } }],
      },
      Email: {
        email: email ?? null,
      },
      "# of Guests": {
        number: parseInt(guests) || 1,
      },
      "Room Type": {
        select: { name: roomType ?? "Standard King" },
      },
      "Arrival Date": {
        date: { start: arrivalDate },
      },
      "Departure Date": {
        date: { start: departureDate },
      },
      "Submitted At": {
        date: { start: new Date().toISOString() },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
