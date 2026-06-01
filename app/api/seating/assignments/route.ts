import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = () => process.env.NOTION_SEATING_DATABASE_ID!;

export async function GET() {
  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ assignments: [] });
  }

  const response = await notion.databases.query({ database_id: DB() });

  const assignments = response.results.map((page: any) => ({
    notionPageId: page.id,
    guestId:    page.properties["GuestId"]?.rich_text?.[0]?.plain_text    ?? "",
    tableId:    page.properties["TableId"]?.rich_text?.[0]?.plain_text    ?? "",
    seatNumber: page.properties["SeatNumber"]?.number                     ?? 0,
  }));

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ ok: true });
  }

  const { guestId, guestName, tableId, seatNumber } = await req.json();

  // Find existing record for this guest
  const existing = await notion.databases.query({
    database_id: DB(),
    filter: { property: "GuestId", rich_text: { equals: guestId } },
  });
  const existingPage = existing.results[0] as any | undefined;

  if (!tableId || !seatNumber) {
    // Unassign — archive existing record if present
    if (existingPage) {
      await notion.pages.update({ page_id: existingPage.id, archived: true });
    }
  } else if (existingPage) {
    // Move / update
    await notion.pages.update({
      page_id: existingPage.id,
      properties: {
        TableId:    { rich_text: [{ text: { content: tableId } }] },
        SeatNumber: { number: seatNumber },
      },
    });
  } else {
    // New assignment
    await notion.pages.create({
      parent: { database_id: DB() },
      properties: {
        Name:       { title:     [{ text: { content: guestName } }] },
        GuestId:    { rich_text: [{ text: { content: guestId } }] },
        TableId:    { rich_text: [{ text: { content: tableId } }] },
        SeatNumber: { number: seatNumber },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
