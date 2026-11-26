import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { Client } from "@notionhq/client";
import { tallyMeals, RsvpRow } from "@/lib/meal-tally";
import { readChoice } from "@/lib/rsvp-party";

export const dynamic = "force-dynamic";

const text = (p: any): string =>
  (p?.rich_text ?? []).map((t: any) => t.plain_text ?? "").join("");

/** GET — meal counts for the caterer, behind the admin password. */
export async function GET(req: NextRequest) {
  const denied = checkAdmin(req);
  if (denied) return denied;

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
          attending:      readChoice(p.Attending) === "Yes",
          plusOne:        readChoice(p["+1"]) === "Yes",
          guestName:      text(p["Guest Name"]),
          mealLabel:      readChoice(p.Meal),
          guestMealLabel: readChoice(p["Guest Meal"]),
          dietary:        text(p["Dietary Restrictions"]),
          email:          String(p.Email?.email ?? "").trim().toLowerCase(),
          guestOf:        text(p["Guest Of"]).trim().toLowerCase(),
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
