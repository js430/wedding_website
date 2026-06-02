import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET() {
  if (!process.env.NOTION_DATABASE_ID) {
    return NextResponse.json({ guests: [] });
  }

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: "Attending",
      select: { equals: "Yes" },
    },
  });

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
