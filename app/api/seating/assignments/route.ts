import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { SEATING_COOKIE, isSeatingAuthed } from "@/lib/seating-auth";
import { cleanText, readJson, withLock } from "@/lib/input";
import { findGuestRows, hostKey, readChoice } from "@/lib/rsvp-party";

export const dynamic = "force-dynamic";

// A Notion page id: 32 hex chars, dashes optional.
const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

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
  const properties = {
    Table: { rich_text: tableName ? [{ text: { content: tableName } }] : [] },
    Seat:  { number: seatNumber ?? null },
  };
  const host: any = await notion.pages.update({
    page_id: guestId, // guestId IS the RSVP Notion page ID
    properties,
  });
  // Their +1's own row (if any) sits at the same table.
  try {
    const party = await findGuestRows(notion, RSVP_DB(), hostKey(host));
    await Promise.all(party.rows.map((p: any) => notion.pages.update({ page_id: p.id, properties })));
  } catch (err: any) {
    console.warn("[Seating] couldn't copy the table to a +1's row:", err?.message ?? err);
  }
}

export async function GET(req: NextRequest) {
  if (!isSeatingAuthed(req.cookies.get(SEATING_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ assignments: [] });
  }

  let response;
  try {
    response = await notion.databases.query({ database_id: SEAT_DB() });
  } catch (err: any) {
    console.error("[Seating] assignments failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  const assignments = response.results.map((page: any) => ({
    notionPageId: page.id,
    guestId:    page.properties["GuestId"]?.rich_text?.[0]?.plain_text ?? "",
    tableId:    page.properties["TableId"]?.rich_text?.[0]?.plain_text ?? "",
    tableName:  page.properties["TableName"]?.rich_text?.[0]?.plain_text ?? "",
    seatNumber: page.properties["SeatNumber"]?.number ?? 0,
  }));

  return NextResponse.json({ assignments });
}

const TABLE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const plain = (id: string) => id.replace(/-/g, "").toLowerCase();

export async function POST(req: NextRequest) {
  if (!isSeatingAuthed(req.cookies.get(SEATING_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await readJson(req);
  if (parsed.error) return parsed.error;
  const { guestId, tableId, seatNumber } = parsed.body as Record<string, any>;
  const tableName = cleanText(parsed.body.tableName, 100);

  // guestId becomes a Notion page id; refuse anything that is not one.
  if (typeof guestId !== "string" || !NOTION_ID.test(guestId)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }
  const unassign = tableId === null || tableId === "" || seatNumber === null || seatNumber === 0;
  if (!unassign) {
    if (typeof tableId !== "string" || !TABLE_ID.test(tableId)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 50) {
      return NextResponse.json({ error: "Invalid seat" }, { status: 400 });
    }
  }

  if (!process.env.NOTION_SEATING_DATABASE_ID) {
    return NextResponse.json({ ok: true });
  }

  // One change at a time, so two tabs can't both take the same seat or give
  // one guest two seats.
  return withLock("seating", async () => {
    try {
      // The guest must be a real, attending RSVP (checked before writing, so a
      // bad id never leaves a stray seating row behind).
      let guestName = "";
      if (!unassign) {
        const rsvp: any = await notion.pages.retrieve({ page_id: guestId }).catch(() => null);
        if (!rsvp || plain(rsvp.parent?.database_id ?? "") !== plain(RSVP_DB())) {
          return NextResponse.json({ error: "Unknown guest" }, { status: 404 });
        }
        if (readChoice(rsvp.properties?.Attending) !== "Yes") {
          return NextResponse.json({ error: "Guest is not attending" }, { status: 400 });
        }
        guestName = rsvp.properties?.Name?.title?.[0]?.plain_text ?? "";
      }

      // ── This guest's seating rows (more than one only after an old race) ─────
      const existing = await notion.databases.query({
        database_id: SEAT_DB(),
        filter: { property: "GuestId", rich_text: { equals: guestId } },
      });
      const [existingPage, ...duplicates] = existing.results as any[];
      await Promise.all(duplicates.map((p) => notion.pages.update({ page_id: p.id, archived: true })));

      if (unassign) {
        if (existingPage) {
          await notion.pages.update({ page_id: existingPage.id, archived: true });
        }
        await syncToRSVP(guestId, null, null);
        return NextResponse.json({ ok: true });
      }

      // ── The seat must be free (or already this guest's) ─────────────────────
      const atTable = await notion.databases.query({
        database_id: SEAT_DB(),
        filter: { property: "TableId", rich_text: { equals: tableId } },
      });
      const occupant = (atTable.results as any[]).find(
        (p) =>
          p.properties?.SeatNumber?.number === seatNumber &&
          (p.properties?.GuestId?.rich_text?.[0]?.plain_text ?? "") !== guestId,
      );
      if (occupant) {
        return NextResponse.json({ error: "seat-taken" }, { status: 409 });
      }

      if (existingPage) {
        await notion.pages.update({
          page_id: existingPage.id,
          properties: {
            TableId:    { rich_text: [{ text: { content: tableId } }] },
            TableName:  { rich_text: [{ text: { content: tableName } }] },
            SeatNumber: { number: seatNumber },
          },
        });
      } else {
        await notion.pages.create({
          parent: { database_id: SEAT_DB() },
          properties: {
            Name:       { title:     [{ text: { content: guestName } }] },
            GuestId:    { rich_text: [{ text: { content: guestId } }] },
            TableId:    { rich_text: [{ text: { content: tableId } }] },
            TableName:  { rich_text: [{ text: { content: tableName } }] },
            SeatNumber: { number: seatNumber },
          },
        });
      }
      await syncToRSVP(guestId, tableName, seatNumber);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("[Seating] save failed:", err?.message ?? err);
      return NextResponse.json({ error: "save-failed" }, { status: 502 });
    }
  });
}
