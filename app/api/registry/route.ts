import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET() {
  if (!process.env.NOTION_REGISTRY_DATABASE_ID) {
    console.warn("[Registry] NOTION_REGISTRY_DATABASE_ID is not set");
    return NextResponse.json({ items: [] });
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_REGISTRY_DATABASE_ID,
    });

    const items = response.results.map((page: any) => {
      const p = page.properties;
      return {
        id:          page.id,
        name:        p.Name?.title?.[0]?.plain_text           ?? "",
        description: p.Description?.rich_text?.[0]?.plain_text ?? "",
        price:       p.Price?.number                           ?? null,
        link:        p.Link?.url                               ?? "",
        imageUrl:    p.ImageURL?.url                           ?? "",
        category:    p.Category?.select?.name                  ?? "Other",
        claimed:     p.Claimed?.checkbox                       ?? false,
        variant:     p.Variant?.rich_text?.[0]?.plain_text ?? "",
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[Registry] Notion query failed:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load registry" },
      { status: 500 }
    );
  }
}
