import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { SEATING_COOKIE, isSeatingAuthed } from "@/lib/seating-auth";
import { belongsTo, isGuestRow, readPlusOne } from "@/lib/rsvp-party";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET(req: NextRequest) {
  if (!isSeatingAuthed(req.cookies.get(SEATING_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_DATABASE_ID) {
    return NextResponse.json({ guests: [] });
  }

  // Everyone attending (paged: Notion returns at most 100 rows at a time).
  const pages: any[] = [];
  try {
    let cursor: string | undefined;
    do {
      const res = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: { property: "Attending", select: { equals: "Yes" } },
        start_cursor: cursor,
        page_size: 100,
      });
      pages.push(...res.results);
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
  } catch (err: any) {
    console.error("[Seating] guest list failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  // Every person is a card of their own and takes one seat: a +1 with a row
  // of their own is listed right after the guest who brought them. (An older
  // RSVP that still keeps its +1 in the host's row can't be seated apart, so
  // that host's card stands for two until scripts/split-plus-ones.mjs is run.)
  const plusOneRows = pages.filter(isGuestRow);
  const listed = new Set<string>();
  const guests: any[] = [];
  for (const page of pages.filter((p) => !isGuestRow(p))) {
    const props = page.properties;
    const name = props.Name?.title?.[0]?.plain_text ?? "Unknown";
    const own = plusOneRows.filter((r) => belongsTo(r, page));
    const plus = readPlusOne(page, own[0]);
    const inRowPlusOne = plus.bringing && own.length === 0;
    guests.push({
      id: page.id,
      name,
      plusOne: inRowPlusOne,
      plusOneName: inRowPlusOne ? plus.name : "",
      dietary: props["Dietary Restrictions"]?.rich_text?.[0]?.plain_text ?? "",
      seatCount: inRowPlusOne ? 2 : 1,
    });
    for (const row of own) {
      listed.add(row.id);
      const firstName = name.trim().split(/\s+/)[0] || "Guest";
      guests.push({
        id: row.id,
        name: row.properties?.Name?.title?.[0]?.plain_text || `${firstName}'s guest`,
        plusOne: false,
        guestOf: name,
        dietary: "",
        seatCount: 1,
      });
    }
  }
  // A +1 whose host isn't on the list (shouldn't happen): still seatable.
  for (const row of plusOneRows) {
    if (listed.has(row.id)) continue;
    guests.push({
      id: row.id,
      name: row.properties?.Name?.title?.[0]?.plain_text || "Guest",
      plusOne: false,
      guestOf: row.properties?.["Guest Of"]?.rich_text?.map((t: any) => t.plain_text).join("") ?? "",
      dietary: "",
      seatCount: 1,
    });
  }

  return NextResponse.json({ guests });
}
