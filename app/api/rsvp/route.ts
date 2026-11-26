import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { buildEditUrl, formatDeadline } from "@/lib/rsvp-token";
import { UPDATES_OPT_OUT } from "@/lib/rsvp-updates";
import { LEGACY_GUEST_MEAL, LEGACY_GUEST_NAME, findGuestRows, syncGuestRow, writeTolerant } from "@/lib/rsvp-party";
import { googleCalendarUrl } from "@/lib/event";
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
}): string {
  const attending = data.attending === "yes";

  const rows = [
    { label: "Attending",   value: attending ? "Joyfully Accepts ✓" : "Regretfully Declines" },
    ...(attending && data.plusOne === "yes" ? [
      { label: "+1",        value: data.plusOneName || "Yes" },
    ] : []),
    ...(attending && data.meal ? [
      { label: "Your meal", value: mealLabel(data.meal) },
    ] : []),
    ...(attending && data.plusOne === "yes" && data.plusOneMeal ? [
      { label: "Guest's meal", value: mealLabel(data.plusOneMeal) },
    ] : []),
    ...(attending && data.dietary ? [
      { label: "Allergies", value: data.dietary },
    ] : []),
    ...(data.message ? [
      { label: "Message",   value: data.message },
    ] : []),
  ];

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#8B0010;width:120px;vertical-align:top;">${r.label}</td>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#1E0008;vertical-align:top;">${escapeHtml(r.value)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#FEE8EC;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;max-width:560px;width:100%;">
            <tr>
              <td style="background:#1E0008;padding:32px;text-align:center;">
                <p style="margin:0;font-family:Georgia,serif;font-style:italic;color:#c9a838;font-size:13px;letter-spacing:0.2em;">Katie &amp; Jeffrey</p>
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">
                  ${attending ? "RSVP Confirmed" : "We'll Miss You"}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">Hi ${escapeHtml(data.name)},</p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;">
                  ${attending
                    ? "We're so excited to celebrate with you on March 27, 2027! Here's a summary of your RSVP:"
                    : "Thank you for letting us know. We're sorry you can't make it, but we appreciate you taking the time to respond."}
                </p>
                ${attending ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #FFB3C4;border-bottom:1px solid #FFB3C4;margin-bottom:24px;">
                  ${rowsHtml}
                </table>
                <p style="margin:0 0 8px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>When:</strong> Saturday, March 27, 2027 · Doors open at 4:30 PM, Ceremony at 5:00 PM
                </p>
                <p style="margin:0 0 18px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Where:</strong> The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903
                </p>
                <p style="margin:0;">
                  <a href="${escapeHtml(data.icsUrl)}" style="font-family:sans-serif;font-size:12px;color:#8B0010;text-decoration:underline;margin-right:14px;">Add to Apple/Outlook</a>
                  <a href="${googleCalendarUrl()}" style="font-family:sans-serif;font-size:12px;color:#8B0010;text-decoration:underline;">Add to Google Calendar</a>
                </p>` : ""}
                ${data.editUrl ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background:#FEE8EC;border:1px solid #FFB3C4;">
                  <tr>
                    <td style="padding:20px 24px;text-align:center;">
                      <p style="margin:0 0 14px;font-family:sans-serif;font-size:13px;line-height:1.6;color:#4a3728;">
                        Need to change your answer? You can update this RSVP yourself
                        until <strong>${formatDeadline()}</strong>.
                      </p>
                      <a href="${escapeHtml(data.editUrl)}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:10px 22px;display:inline-block;">
                        Edit my RSVP
                      </a>
                      <p style="margin:14px 0 0;font-family:sans-serif;font-size:11px;color:#8B0010;">
                        This link is just for you — please don't forward it.
                      </p>
                    </td>
                  </tr>
                </table>` : `
                <p style="margin:24px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  Need to make a change? Reach out to us directly.
                </p>`}
                <p style="margin:24px 0 0;font-family:sans-serif;font-size:12px;line-height:1.6;color:#4a3728;text-align:center;">
                  ${data.noUpdates
                    ? "You've opted out of wedding update emails, so we'll only email you about your RSVP. Changed your mind? Use the Edit my RSVP link above."
                    : "We'll send any major updates and news about the wedding to this email address. Rather not get them? Use the Edit my RSVP link above to opt out."}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#FEE8EC;padding:20px;text-align:center;">
                <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8B0010;">Katie &amp; Jeffrey · March 27, 2027 · Charlottesville, VA</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
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
      try {
        const prior = await notion.databases.query({
          database_id: databaseId,
          filter: { property: "Email", email: { equals: email } },
          page_size: 1,
        });
        existingId = prior.results[0]?.id ?? null;
      } catch (err: any) {
        // A lookup failure must not cost the guest their RSVP — fall through
        // and create a row, accepting a possible duplicate.
        console.warn("[RSVP] duplicate check failed:", err?.message ?? err);
      }

      // A +1 gets their own row (see lib/rsvp-party.ts), linked by this email.
      const party = await findGuestRows(notion, databaseId, email);
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
        await syncGuestRow(notion, databaseId, party.rows, email, name, {
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
          ? "You're on the list! RSVP confirmed — Katie & Jeffrey 💍"
          : "RSVP received — Katie & Jeffrey",
        html: buildRSVPEmail({
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
