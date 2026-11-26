import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { SEATING_COOKIE, isSeatingAuthed } from "@/lib/seating-auth";
import { guestOfKey, hostKey, isGuestRow, readPlusOne } from "@/lib/rsvp-party";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET(req: NextRequest) {
  if (!isSeatingAuthed(req.cookies.get(SEATING_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_DATABASE_ID) {
    return NextResponse.json({ guests: [] });
  }

  let response;
  try {
    response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: "Attending",
      select: { equals: "Yes" },
    },
  });
  } catch (err: any) {
    console.error("[Seating] guest list failed:", err?.message ?? err);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  // A +1 with a row of their own sits with the guest who brought them: list
  // hosts only, each with their +1 (from that row, or older +1 columns).
  const pages = response.results as any[];
  const plusOneRows = new Map<string, any>();
  for (const page of pages) if (isGuestRow(page)) plusOneRows.set(guestOfKey(page), page);

  const guests = pages.filter((page) => !isGuestRow(page)).map((page) => {
    const props = page.properties;
    const plus = readPlusOne(page, plusOneRows.get(hostKey(page)));
    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text ?? "Unknown",
      plusOne: plus.bringing,
      plusOneName: plus.bringing ? plus.name : "",
      dietary: props["Dietary Restrictions"]?.rich_text?.[0]?.plain_text ?? "",
      seatCount: plus.bringing ? 2 : 1,
    };
  });

  return NextResponse.json({ guests });
}
