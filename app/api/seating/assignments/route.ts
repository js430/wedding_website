import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SEAT_DB  = () => process.env.NOTION_SEATING_DATABASE_ID!;
const RSVP_DB  = () => process.env.NOTION_DATABASE_ID!;

// ── Write table+seat back to the RSVP record ──────────────────────────────────
async function syncToRSVP(
  guestId: string,
  tableName: string | null,
  seatNumber: number | null,
) {
  if (!process.env.NOTION_DATABASE_ID) return;
  await notion.pages.update({
    page_id: guestId, // guestId IS the RSVP Notion page ID
    properties: {
      Table: { rich_text: tableName ? [{ text: { content: tableName } }] : [] },
      Seat:  { number: seatNumber ?? null },
    },
  });
}

export async function GET() {
  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ assignments: [] });
  }

  const response = await notion.databases.query({ database_id: SEAT_DB() });

  const assignments = response.results.map((page: any) => ({
    notionPageId: page.id,
    guestId:    page.properties["GuestId"]?.rich_text?.[0]?.plain_text ?? "",
    tableId:    page.properties["TableId"]?.rich_text?.[0]?.plain_text ?? "",
    tableName:  page.properties["TableName"]?.rich_text?.[0]?.plain_text ?? "",
    seatNumber: page.properties["SeatNumber"]?.number ?? 0,
  }));

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ ok: true });
  }

  const { guestId, guestName, tableId, tableName, seatNumber } = await req.json();

  // ── Find existing seating record for this guest ───────────────────────────
  const existing = await notion.databases.query({
    database_id: SEAT_DB(),
    filter: { property: "GuestId", rich_text: { equals: guestId } },
  });
  const existingPage = existing.results[0] as any | undefined;

  if (!tableId || !seatNumber) {
    // Unassign
    if (existingPage) {
      await notion.pages.update({ page_id: existingPage.id, archived: true });
    }
    await syncToRSVP(guestId, null, null);
  } else if (existingPage) {
    // Update existing seating record
    await notion.pages.update({
      page_id: existingPage.id,
      properties: {
        TableId:   { rich_text: [{ text: { content: tableId } }] },
        TableName: { rich_text: [{ text: { content: tableName ?? "" } }] },
        SeatNumber: { number: seatNumber },
      },
    });
    await syncToRSVP(guestId, tableName, seatNumber);
  } else {
    // New seating record
    await notion.pages.create({
      parent: { database_id: SEAT_DB() },
      properties: {
        Name:      { title:     [{ text: { content: guestName } }] },
        GuestId:   { rich_text: [{ text: { content: guestId } }] },
        TableId:   { rich_text: [{ text: { content: tableId } }] },
        TableName: { rich_text: [{ text: { content: tableName ?? "" } }] },
        SeatNumber: { number: seatNumber },
      },
    });
    await syncToRSVP(guestId, tableName, seatNumber);
  }

  return NextResponse.json({ ok: true });
}
