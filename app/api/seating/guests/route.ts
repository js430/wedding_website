import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { SEATING_COOKIE, isSeatingAuthed } from "@/lib/seating-auth";

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

  const guests = response.results.map((page: any) => {
    const props = page.properties;
    const plusOneName = props["Guest Name"]?.rich_text?.[0]?.plain_text ?? "";
    const plusOne = props["+1"]?.select?.name === "Yes" && !!plusOneName;
    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text ?? "Unknown",
      plusOne,
      plusOneName: plusOne ? plusOneName : "",
      dietary: props["Dietary Restrictions"]?.rich_text?.[0]?.plain_text ?? "",
      seatCount: plusOne ? 2 : 1,
    };
  });

  return NextResponse.json({ guests });
}
