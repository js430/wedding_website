import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const resend  = new Resend(process.env.RESEND_API_KEY);

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function buildHotelEmail(data: {
  firstName: string;
  lastName: string;
  ihgNumber: string;
  guests: string;
  roomType: string;
  arrivalDate: string;
  departureDate: string;
  email: string;
}): string {
  const rows = [
    { label: "Name",       value: `${data.firstName} ${data.lastName}` },
    { label: "Room Type",  value: data.roomType },
    { label: "Guests",     value: data.guests },
    { label: "Arrival",    value: formatDate(data.arrivalDate) },
    { label: "Departure",  value: formatDate(data.departureDate) },
    ...(data.ihgNumber ? [{ label: "IHG #", value: data.ihgNumber }] : []),
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
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">Room Request Received</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">Hi ${data.firstName},</p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;">
                  We've received your hotel room request. Here's a summary of what you submitted:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #FFB3C4;border-bottom:1px solid #FFB3C4;margin-bottom:24px;">
                  ${rowsHtml}
                </table>
                <p style="margin:0 0 8px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Venue:</strong> The Forum Hotel, 540 Massie Rd, Charlottesville, VA 22903
                </p>
                <p style="margin:0 0 8px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Rate:</strong> Approx. $270 + taxes &amp; fees per room
                </p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:13px;color:#4a3728;">
                  <strong>Block expires:</strong> February 27, 2027
                </p>
                <p style="margin:0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  We'll be in touch with confirmation details. See you on March 27!
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
  const { ihgNumber, firstName, lastName, guests, roomType, arrivalDate, departureDate, email } = body;

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_HOTEL_DATABASE_ID) {
    console.warn("[HOTEL] NOTION_TOKEN or NOTION_HOTEL_DATABASE_ID not set — logging only");
    console.log("[HOTEL]", new Date().toISOString(), body);
    return NextResponse.json({ ok: true });
  }

  // ── Save to Notion ────────────────────────────────────────────────────────
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_HOTEL_DATABASE_ID },
    properties: {
      Name:           { title:     [{ text: { content: `${firstName ?? ""} ${lastName ?? ""}`.trim() } }] },
      "IHG Rewards #":{ rich_text: [{ text: { content: ihgNumber ?? "" } }] },
      Email:          { email:     email ?? null },
      "# of Guests":  { number:    parseInt(guests) || 1 },
      "Room Type":    { select:    { name: roomType ?? "Standard King" } },
      "Arrival Date": { date:      { start: arrivalDate } },
      "Departure Date":{ date:     { start: departureDate } },
      "Submitted At": { date:      { start: new Date().toISOString() } },
    },
  });

  // ── Send confirmation email ───────────────────────────────────────────────
  if (email && process.env.RESEND_API_KEY) {
    const from = process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>";
    await resend.emails.send({
      from,
      to:      email,
      subject: "Hotel room request received — Jeffrey & Katie 🏨",
      html:    buildHotelEmail({ firstName, lastName, ihgNumber, guests, roomType, arrivalDate, departureDate, email }),
    });
  }

  return NextResponse.json({ ok: true });
}
