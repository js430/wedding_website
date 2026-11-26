import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { verifyEditToken, editingClosed, formatDeadline } from "@/lib/rsvp-token";
import { isValidMeal, mealLabel, labelToId } from "@/lib/meals";
import { UPDATES_OPT_OUT } from "@/lib/rsvp-updates";
import { LEGACY_GUEST_MEAL, LEGACY_GUEST_NAME, findGuestRows, hostKey, hostName, hostRefs, readChoice, readPlusOne, syncGuestRow, writeTolerant } from "@/lib/rsvp-party";
import { withLock } from "@/lib/input";
import { cleanText, readJson } from "@/lib/input";

export const dynamic = "force-dynamic";

function notionClient() {
  return new Client({ auth: process.env.NOTION_TOKEN });
}

/** Pull the RSVP fields the guest is allowed to see and change. */
function readRsvp(page: any, guestRow?: any) {
  const p = page.properties;
  const plus = readPlusOne(page, guestRow);
  return {
    name:        p.Name?.title?.[0]?.plain_text ?? "",
    email:       p.Email?.email ?? "",
    attending:   readChoice(p.Attending) === "Yes" ? "yes" : "no",
    plusOne:     plus.bringing ? "yes" : "no",
    plusOneName: plus.name,
    meal:        labelToId(readChoice(p.Meal)),
    plusOneMeal: labelToId(plus.mealLabel),
    dietary:     p["Dietary Restrictions"]?.rich_text?.[0]?.plain_text ?? "",
    message:     p.Message?.rich_text?.[0]?.plain_text ?? "",
    noUpdates:   p[UPDATES_OPT_OUT]?.checkbox === true || /^(yes|true)$/i.test(readChoice(p[UPDATES_OPT_OUT])),
  };
}

/** GET /api/rsvp/edit?token=… — current answers behind a signed token. */
export async function GET(req: NextRequest) {
  const token  = req.nextUrl.searchParams.get("token") ?? "";
  const pageId = verifyEditToken(token);

  if (!pageId) {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  try {
    const notion = notionClient();
    const page = await notion.pages.retrieve({ page_id: pageId });
    const party = await findGuestRows(notion, process.env.NOTION_DATABASE_ID!, hostRefs(hostName(page), hostKey(page)));
    return NextResponse.json({
      rsvp:     readRsvp(page, party.rows[0]),
      closed:   editingClosed(),
      deadline: formatDeadline(),
    });
  } catch (err: any) {
    console.error("[RSVP edit] retrieve failed:", err?.message ?? err);
    // A missing page means the link points nowhere; anything else is Notion
    // having a moment, and the guest should just try again.
    return err?.code === "object_not_found" || err?.code === "validation_error"
      ? NextResponse.json({ error: "not-found" }, { status: 404 })
      : NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

/** POST /api/rsvp/edit — save changes, until the deadline passes. */
export async function POST(req: NextRequest) {
  const parsed = await readJson(req);
  if (parsed.error) return parsed.error;
  const { token, attending, plusOne, meal, plusOneMeal, noUpdates } = parsed.body as Record<string, any>;
  const plusOneName = cleanText(parsed.body.plusOneName, 200);
  const dietary     = cleanText(parsed.body.dietary, 1000);
  const message     = cleanText(parsed.body.message, 2000);

  const pageId = verifyEditToken(typeof token === "string" ? token : "");
  if (!pageId) {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  // The deadline is enforced here, not in the browser, so an old open tab
  // or a hand-made request cannot save after it passes.
  if (editingClosed()) {
    return NextResponse.json(
      { error: "closed", deadline: formatDeadline() },
      { status: 403 }
    );
  }

  if (attending !== "yes" && attending !== "no") {
    return NextResponse.json({ error: "attending-required" }, { status: 400 });
  }
  const attendingYes = attending === "yes";
  const bringingPlusOne = attendingYes && plusOne === "yes";

  if (attendingYes && !isValidMeal(meal)) {
    return NextResponse.json({ error: "meal-required" }, { status: 400 });
  }
  if (bringingPlusOne && !isValidMeal(plusOneMeal)) {
    return NextResponse.json({ error: "guest-meal-required" }, { status: 400 });
  }

  try {
    const notion = notionClient();
    const databaseId = process.env.NOTION_DATABASE_ID!;
    const host: any = await notion.pages.retrieve({ page_id: pageId });
    const key = hostKey(host) || pageId;
    const name = hostName(host);
    const guestMealLabel = bringingPlusOne ? mealLabel(plusOneMeal) : null;

    // Same lock as the RSVP form, so an edit and a resubmission take turns.
    await withLock(`rsvp:${key}`, async () => {
      const party = await findGuestRows(notion, databaseId, hostRefs(name, hostKey(host)));
      const properties: Record<string, any> = {
        Attending:              { select:    { name: attendingYes ? "Yes" : "No" } },
        "+1":                   { select:    { name: bringingPlusOne ? "Yes" : "No" } },
        Meal:                   { select:    attendingYes ? { name: mealLabel(meal) } : null },
        "Dietary Restrictions": { rich_text: [{ text: { content: attendingYes ? dietary : "" } }] },
        Message:                { rich_text: [{ text: { content: message } }] },
        "Submitted At":         { date:      { start: new Date().toISOString() } },
        [UPDATES_OPT_OUT]:      { checkbox:  noUpdates === true },
        [LEGACY_GUEST_NAME]:    { rich_text: party.supported || !bringingPlusOne ? [] : [{ text: { content: plusOneName } }] },
        [LEGACY_GUEST_MEAL]:    { select:    party.supported || !guestMealLabel ? null : { name: guestMealLabel } },
      };
      await writeTolerant(properties, [UPDATES_OPT_OUT, LEGACY_GUEST_NAME, LEGACY_GUEST_MEAL], (props) =>
        notion.pages.update({ page_id: pageId, properties: props }),
      );
      if (party.supported) {
        await syncGuestRow(notion, databaseId, party.rows, name, {
          bringing: bringingPlusOne,
          name: plusOneName,
          mealLabel: guestMealLabel,
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[RSVP edit] update failed:", err?.message ?? err);
    return NextResponse.json({ error: "update-failed" }, { status: 500 });
  }
}
