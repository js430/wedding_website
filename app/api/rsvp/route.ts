import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { buildEditUrl, formatDeadline } from "@/lib/rsvp-token";
import { UPDATES_OPT_OUT } from "@/lib/rsvp-updates";
import { LEGACY_GUEST_MEAL, LEGACY_GUEST_NAME, findGuestRows, hostName, hostRefs, syncGuestRow, writeTolerant } from "@/lib/rsvp-party";
import { googleCalendarUrl } from "@/lib/event";
import { C, button, card, details, emailLayout, eventBlock, eyebrow, greeting, para, signoff } from "@/lib/email-layout";
import { isValidMeal, mealLabel } from "@/lib/meals";
import { cleanEmail, cleanText, escapeHtml, readJson, withLock } from "@/lib/input";
import { allow } from "@/lib/rate-limit";
import { clientKey } from "@/lib/invite-guard";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Constructed per request: `new Resend()` throws when the key is absent, which
// would otherwise fail `next build` on any machine without the secret.
function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildRSVPEmail(data: {
  name: string;
  attending: string;
  plusOne: string;
  plusOneName: string;
  meal: string;
  plusOneMeal: string;
  dietary: string;
  message: string;
  editUrl: string;
  noUpdates: boolean;
  icsUrl: string;
}): { html: string; text: string } {
  const attending = data.attending === "yes";
  const bringing  = attending && data.plusOne === "yes";
  const guestName = data.plusOneName.trim();
  const guestOf   = guestName ? `${guestName.split(/\s+/)[0]}'s meal` : "Your guest's meal";

  const rows = [
    { label: "Your reply", value: attending ? "Joyfully accepts" : "Regretfully declines" },
    ...(bringing ? [{ label: "Bringing", value: guestName || "A guest" }] : []),
    ...(attending && data.meal ? [{ label: "Your meal", value: mealLabel(data.meal) }] : []),
    ...(bringing && data.plusOneMeal ? [{ label: guestOf, value: mealLabel(data.plusOneMeal) }] : []),
    ...(attending && data.dietary ? [{ label: "Allergies & dietary needs", value: data.dietary }] : []),
    ...(data.message ? [{ label: "Your note to us", value: data.message }] : []),
  ];

  const intro = attending
    ? "We're so happy you'll be celebrating with us! Here's what we have down for you."
    : "Thank you for letting us know. We're sorry you can't make it, and we'll be thinking of you on the day.";

  const updates = data.noUpdates
    ? "You've opted out of wedding update emails, so we'll only write about your RSVP. Changed your mind? You can switch them back on from your RSVP."
    : "We'll send any big updates about the wedding to this address. Rather not get them? You can opt out from your RSVP.";

  const editBox = data.editUrl
    ? card(`
        ${eyebrow(attending ? "Plans change?" : "Change of heart?")}
        ${para(`You can update your RSVP any time until <strong style="color:${C.darkest};">${escapeHtml(formatDeadline())}</strong>.`, { margin: "0 0 18px" })}
        ${button(data.editUrl, "Edit my RSVP")}
        ${para("This link is just for you, so please don't forward it.", { size: 12, color: C.muted, margin: "14px 0 0" })}
      `)
    : para("Need to make a change? Just reply to this email and we'll sort it out.");

  const bodyHtml = [
    greeting(data.name),
    para(intro, { margin: "0 0 24px" }),
    details(rows),
    attending ? eventBlock({ icsUrl: data.icsUrl, googleUrl: googleCalendarUrl() }) : "",
    editBox,
    para(updates, { size: 13, color: C.muted, margin: "4px 0 0" }),
    signoff(),
  ].join("\n");

  const html = emailLayout({
    kicker: "RSVP received",
    title: attending ? "You're on the list!" : "We'll miss you",
    preheader: attending
      ? "Your RSVP is confirmed. See you on Saturday, March 27, 2027!"
      : "Thank you for letting us know.",
    bodyHtml,
  });

  const first = data.name.trim().split(/\s+/)[0];
  const text = [
    `Hi ${first || "there"},`,
    "",
    intro,
    "",
    ...rows.map((r) => `${r.label}: ${r.value}`),
    ...(attending ? [
      "",
      "Saturday, March 27, 2027",
      "Doors open at 4:30 PM · Ceremony at 5:00 PM",
      "The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903",
      `Add to your calendar: ${data.icsUrl}`,
    ] : []),
    "",
    ...(data.editUrl
      ? [`You can update your RSVP until ${formatDeadline()}:`, data.editUrl, "(This link is just for you, so please don't forward it.)"]
      : ["Need to make a change? Just reply to this email."]),
    "",
    updates,
    "",
    "With love,",
    "Katie & Jeffrey",
  ].join("\n");

  return { html, text };
}

export async function POST(req: NextRequest) {
  const parsed = await readJson(req);
  if (parsed.error) return parsed.error;
  const body = parsed.body;

  // ── Clean and validate ────────────────────────────────────────────────────
  // Before any Notion call, so it works with no Notion configured.
  const name        = cleanText(body.name, 200);
  const email       = cleanEmail(body.email);
  const attending   = body.attending === "yes" ? "yes" : body.attending === "no" ? "no" : "";
  const plusOne     = attending === "yes" && body.plusOne === "yes" ? "yes" : "no";
  const plusOneName = plusOne === "yes" ? cleanText(body.plusOneName, 200) : "";
  const meal        = attending === "yes" ? body.meal : "";
  const plusOneMeal = plusOne === "yes" ? body.plusOneMeal : "";
  const dietary     = attending === "yes" ? cleanText(body.dietary, 1000) : "";
  const message     = cleanText(body.message, 2000);
  const noUpdates   = body.noUpdates === true;

  if (!name)      return NextResponse.json({ error: "name-required" }, { status: 400 });
  if (!email)     return NextResponse.json({ error: "email-invalid" }, { status: 400 });
  if (!attending) return NextResponse.json({ error: "attending-required" }, { status: 400 });
  // A guest who declines needs no meal.
  if (attending === "yes" && !isValidMeal(meal)) {
    return NextResponse.json({ error: "meal-required" }, { status: 400 });
  }
  if (plusOne === "yes" && !isValidMeal(plusOneMeal)) {
    return NextResponse.json({ error: "guest-meal-required" }, { status: 400 });
  }

  // Each RSVP sends an email, so cap how often one network or one address can
  // trigger it. Generous enough for a household fixing a typo a few times.
  if (!allow(`rsvp-ip:${clientKey(req)}`, 30, 60 * 60 * 1000) || !allow(`rsvp-email:${email}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.warn("[RSVP] NOTION_TOKEN or NOTION_DATABASE_ID not set — logging only");
    console.log("[RSVP]", new Date().toISOString(), { name, email, attending, plusOne });
    return NextResponse.json({ ok: true, emailed: false });
  }
  const databaseId = process.env.NOTION_DATABASE_ID;

  // ── Save to Notion ────────────────────────────────────────────────────────
  // One row per email: a guest who submits twice (or hits back and resubmits)
  // updates their answer instead of inflating the headcount with a second row.
  // The lock makes two submissions for the same email take turns, so both
  // can't miss each other's row and create two.
  let saved: { value: { id: string }; optOutSaved: boolean };
  try {
    saved = await withLock(`rsvp:${email}`, async () => {
      let existingId: string | null = null;
      let priorName = "";
      try {
        const prior = await notion.databases.query({
          database_id: databaseId,
          filter: { property: "Email", email: { equals: email } },
          page_size: 1,
        });
        existingId = prior.results[0]?.id ?? null;
        priorName = hostName(prior.results[0]);
      } catch (err: any) {
        // A lookup failure must not cost the guest their RSVP — fall through
        // and create a row, accepting a possible duplicate.
        console.warn("[RSVP] duplicate check failed:", err?.message ?? err);
      }

      // A +1 gets their own row (see lib/rsvp-party.ts), linked by the guest's
      // name (or email, on older rows); the earlier name finds it after a rename.
      const party = await findGuestRows(notion, databaseId, hostRefs(name, priorName, email));
      const guestMealLabel = plusOne === "yes" ? mealLabel(plusOneMeal as string) : null;

      const properties: Record<string, any> = {
        Name:                   { title:     [{ text: { content: name } }] },
        Email:                  { email },
        Attending:              { select:    { name: attending === "yes" ? "Yes" : "No" } },
        "+1":                   { select:    { name: plusOne === "yes" ? "Yes" : "No" } },
        Meal:                   { select:    attending === "yes" ? { name: mealLabel(meal as string) } : null },
        "Dietary Restrictions": { rich_text: [{ text: { content: dietary } }] },
        Message:                { rich_text: [{ text: { content: message } }] },
        "Submitted At":         { date:      { start: new Date().toISOString() } },
        [UPDATES_OPT_OUT]:      { checkbox:  noUpdates },
        // With separate +1 rows these older columns are cleared; without the
        // "Guest Of" column they still hold the +1, as before.
        [LEGACY_GUEST_NAME]:    { rich_text: party.supported ? [] : [{ text: { content: plusOneName } }] },
        [LEGACY_GUEST_MEAL]:    { select:    party.supported ? null : guestMealLabel ? { name: guestMealLabel } : null },
      };

      const written = await writeTolerant(properties, [UPDATES_OPT_OUT, LEGACY_GUEST_NAME, LEGACY_GUEST_MEAL], (props) =>
        existingId
          ? notion.pages.update({ page_id: existingId, properties: props })
          : notion.pages.create({ parent: { database_id: databaseId }, properties: props }),
      );

      if (party.supported) {
        await syncGuestRow(notion, databaseId, party.rows, name, {
          bringing: plusOne === "yes",
          name: plusOneName,
          mealLabel: guestMealLabel,
        });
      }

      return { value: written.value, optOutSaved: !written.dropped.includes(UPDATES_OPT_OUT) };
    });
  } catch (err: any) {
    console.error("[RSVP] Saving to Notion failed:", err?.message ?? err);
    return NextResponse.json({ error: "save-failed" }, { status: 502 });
  }

  // ── Send confirmation email ───────────────────────────────────────────────
  let emailed = true;

  if (process.env.RESEND_API_KEY) {
    const from = process.env.REGISTRY_FROM_EMAIL ?? "Katie & Jeffrey <onboarding@resend.dev>";
    // Links must be absolute in email; prefer the configured site URL and fall
    // back to the origin this request arrived on.
    const origin  = publicOrigin(req);
    const editUrl = buildEditUrl(saved.value.id, origin);
    const icsUrl  = `${origin}/api/calendar`;

    try {
      const { error } = await resendClient().emails.send({
        from,
        to:      email,
        subject: attending === "yes"
          ? "You're on the list! See you March 27 💍"
          : "We received your RSVP",
        ...buildRSVPEmail({
          name, attending, plusOne, plusOneName, meal: meal as string, plusOneMeal: plusOneMeal as string,
          dietary, message, editUrl, icsUrl,
          // Only claim an opt-out that was actually recorded.
          noUpdates: noUpdates && saved.optOutSaved,
        }),
      });
      // The RSVP itself is already saved, so a failed email must not fail the
      // request; the page tells the guest instead.
      if (error) {
        console.error("[RSVP] Confirmation email failed:", error);
        emailed = false;
      }
    } catch (err: any) {
      console.error("[RSVP] Confirmation email failed:", err?.message ?? err);
      emailed = false;
    }
  } else {
    console.warn("[RSVP] RESEND_API_KEY not set — no confirmation email sent.");
    emailed = false;
  }

  return NextResponse.json({ ok: true, emailed });
}
