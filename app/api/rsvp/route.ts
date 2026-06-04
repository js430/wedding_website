import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const resend  = new Resend(process.env.RESEND_API_KEY);

function buildRSVPEmail(data: {
  name: string;
  attending: string;
  plusOne: string;
  plusOneName: string;
  dietary: string;
  message: string;
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
                <p style="margin:0;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Where:</strong> The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903
                </p>` : ""}
                <p style="margin:24px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  Need to make a change? Reach out to us directly.
                </p>
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
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Name:                   { title:     [{ text: { content: name ?? "" } }] },
      Email:                  { email:     email ?? null },
      Attending:              { select:    { name: attending === "yes" ? "Yes" : "No" } },
      "+1":                   { select:    { name: plusOne === "yes" ? "Yes" : "No" } },
      "Guest Name":           { rich_text: [{ text: { content: plusOneName ?? "" } }] },
      "Dietary Restrictions": { rich_text: [{ text: { content: dietary ?? "" } }] },
      Message:                { rich_text: [{ text: { content: message ?? "" } }] },
      "Submitted At":         { date:      { start: new Date().toISOString() } },
    },
  });

  // ── Send confirmation email ───────────────────────────────────────────────
  if (email && process.env.RESEND_API_KEY) {
    const from = process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>";
    await resend.emails.send({
      from,
      to:      email,
      subject: attending === "yes"
        ? "You're on the list! RSVP confirmed — Jeffrey & Katie 💍"
        : "RSVP received — Jeffrey & Katie",
      html: buildRSVPEmail({ name: name ?? "", attending, plusOne, plusOneName, dietary, message }),
    });
  }

  return NextResponse.json({ ok: true });
}
