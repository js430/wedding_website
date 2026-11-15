import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { tallyMeals, RsvpRow } from "@/lib/meal-tally";

export const dynamic = "force-dynamic";

const text = (p: any): string =>
  (p?.rich_text ?? []).map((t: any) => t.plain_text ?? "").join("");

/** GET — meal counts for the caterer, behind the admin password. */
export async function GET(req: NextRequest) {
  const given = req.headers.get("x-admin-password") ?? "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  if (given !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    return NextResponse.json(tallyMeals([]));
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const rows: RsvpRow[] = [];
    let cursor: string | undefined;

    do {
      const res = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        page_size: 100,
        start_cursor: cursor,
      });
      for (const page of res.results as any[]) {
        const p = page.properties ?? {};
        rows.push({
          name:           (p.Name?.title ?? []).map((t: any) => t.plain_text ?? "").join("") || "Unknown",
          attending:      p.Attending?.select?.name === "Yes",
          plusOne:        p["+1"]?.select?.name === "Yes",
          guestName:      text(p["Guest Name"]),
          mealLabel:      p.Meal?.select?.name ?? "",
          guestMealLabel: p["Guest Meal"]?.select?.name ?? "",
          dietary:        text(p["Dietary Restrictions"]),
        });
      }
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return NextResponse.json(tallyMeals(rows));
  } catch (err) {
    console.error("[Meals] Failed to load meals:", err);
    return NextResponse.json({ error: "Failed to load meals" }, { status: 500 });
  }
}
