import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { buildEditUrl, formatDeadline } from "@/lib/rsvp-token";
import { googleCalendarUrl } from "@/lib/event";

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
  dietary: string;
  message: string;
  editUrl: string;
  icsUrl: string;
}): string {
  const attending = data.attending === "yes";

  const rows = [
    { label: "Attending",   value: attending ? "Joyfully Accepts ✓" : "Regretfully Declines" },
    ...(attending && data.plusOne === "yes" ? [
      { label: "+1",        value: data.plusOneName || "Yes" },
    ] : []),
    ...(attending && data.dietary ? [
      { label: "Dietary",   value: data.dietary },
    ] : []),
    ...(data.message ? [
      { label: "Message",   value: data.message },
    ] : []),
  ];

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#8B0010;width:120px;vertical-align:top;">${r.label}</td>
      <td style="padding:8px 0;font-family:sans-serif;font-size:13px;color:#1E0008;vertical-align:top;">${r.value}</td>
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
                <p style="margin:0;font-family:Georgia,serif;font-style:italic;color:#c9a838;font-size:13px;letter-spacing:0.2em;">Jeffrey &amp; Katie</p>
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">
                  ${attending ? "RSVP Confirmed" : "We'll Miss You"}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">Hi ${data.name},</p>
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
                  <strong>When:</strong> Saturday, March 27, 2027 · Doors open at 4:00 PM, Ceremony at 5:00 PM
                </p>
                <p style="margin:0 0 18px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Where:</strong> The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903
                </p>
                <p style="margin:0;">
                  <a href="${data.icsUrl}" style="font-family:sans-serif;font-size:12px;color:#8B0010;text-decoration:underline;margin-right:14px;">Add to Apple/Outlook</a>
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
                      <a href="${data.editUrl}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:10px 22px;display:inline-block;">
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
              </td>
            </tr>
            <tr>
              <td style="background:#FEE8EC;padding:20px;text-align:center;">
                <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8B0010;">Jeffrey &amp; Katie · March 27, 2027 · Charlottesville, VA</p>
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
  const body = await req.json();
  const { name, email, attending, plusOne, plusOneName, dietary, message } = body;

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.warn("[RSVP] NOTION_TOKEN or NOTION_DATABASE_ID not set — logging only");
    console.log("[RSVP]", new Date().toISOString(), body);
    return NextResponse.json({ ok: true });
  }

  // ── Save to Notion ────────────────────────────────────────────────────────
  // One row per email: a guest who submits twice (or hits back and resubmits)
  // updates their answer instead of inflating the headcount with a second row.
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  let existingId: string | null = null;

  if (address) {
    try {
      const prior = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: { property: "Email", email: { equals: address } },
        page_size: 1,
      });
      existingId = prior.results[0]?.id ?? null;
    } catch (err: any) {
      // A lookup failure must not cost the guest their RSVP — fall through
      // and create a row, accepting a possible duplicate.
      console.warn("[RSVP] duplicate check failed:", err?.message ?? err);
    }
  }

  const properties = {
      Name:                   { title:     [{ text: { content: name ?? "" } }] },
      Email:                  { email:     address || null },
      Attending:              { select:    { name: attending === "yes" ? "Yes" : "No" } },
      "+1":                   { select:    { name: plusOne === "yes" ? "Yes" : "No" } },
      "Guest Name":           { rich_text: [{ text: { content: plusOneName ?? "" } }] },
      "Dietary Restrictions": { rich_text: [{ text: { content: dietary ?? "" } }] },
      Message:                { rich_text: [{ text: { content: message ?? "" } }] },
      "Submitted At":         { date:      { start: new Date().toISOString() } },
  };

  const created = existingId
    ? await notion.pages.update({ page_id: existingId, properties })
    : await notion.pages.create({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties,
      });

  // ── Send confirmation email ───────────────────────────────────────────────
  let emailed = true;

  if (email && process.env.RESEND_API_KEY) {
    const from = process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>";
    // Links must be absolute in email; prefer the configured site URL and fall
    // back to the origin this request arrived on.
    const origin  = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const editUrl = buildEditUrl(created.id, origin);
    const icsUrl  = `${origin}/api/calendar`;

    const { error } = await resendClient().emails.send({
      from,
      to:      email,
      subject: attending === "yes"
        ? "You're on the list! RSVP confirmed — Jeffrey & Katie 💍"
        : "RSVP received — Jeffrey & Katie",
      html: buildRSVPEmail({ name: name ?? "", attending, plusOne, plusOneName, dietary, message, editUrl, icsUrl }),
    });

    // The RSVP itself is already saved, so a failed email must not fail the
    // request — but it was previously swallowed entirely, which made a guest
    // who never received their confirmation look like a successful RSVP.
    if (error) {
      console.error("[RSVP] Confirmation email failed:", error);
      emailed = false;
    }
  } else if (email) {
    console.warn("[RSVP] RESEND_API_KEY not set — no confirmation email sent.");
    emailed = false;
  }

  return NextResponse.json({ ok: true, emailed });
}
