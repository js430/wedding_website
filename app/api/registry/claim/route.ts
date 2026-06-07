import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { encrypt } from "@/lib/encrypt";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const resend  = new Resend(process.env.RESEND_API_KEY);

interface ClaimItem {
  id:      string;
  name:    string;
  price:   number | null;
  link:    string;
  variant: string;
}

function buildEmail(guestName: string, items: ClaimItem[]): string {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #FFB3C4;">
          <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#1E0008;">
            ${item.name}
          </p>
          ${item.variant ? `<p style="margin:2px 0 0;font-family:sans-serif;font-size:12px;color:#8B0010;">Preferred: ${item.variant}</p>` : ""}
          ${item.price ? `<p style="margin:4px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;">$${item.price.toFixed(2)}</p>` : ""}
        </td>
        <td style="padding:12px 0 12px 16px;border-bottom:1px solid #FFB3C4;text-align:right;white-space:nowrap;">
          ${
            item.link
              ? `<a href="${item.link}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:8px 16px;display:inline-block;">View Item</a>`
              : ""
          }
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#FEE8EC;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;max-width:560px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background:#1E0008;padding:32px;text-align:center;">
                <p style="margin:0;font-family:Georgia,serif;font-style:italic;color:#c9a838;font-size:13px;letter-spacing:0.2em;">
                  Jeffrey &amp; Katie
                </p>
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">
                  Your Registry Picks
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">
                  Hi ${guestName},
                </p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;">
                  Here are the items you saved from our registry. Each link will take you
                  directly to the retailer to complete your purchase. Thank you so much!
                </p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                </table>

                <p style="margin:28px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  If you have any questions, don't hesitate to reach out.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#FEE8EC;padding:20px;text-align:center;">
                <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8B0010;">
                  Jeffrey &amp; Katie · March 27, 2027 · Charlottesville, VA
                </p>
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
  const { guestName, email, items } = await req.json() as {
    guestName: string;
    email: string;
    items: ClaimItem[];
  };

  if (!items?.length || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // ── Mark items as claimed in Notion — name+email stored encrypted ──────────
  if (process.env.NOTION_REGISTRY_DATABASE_ID) {
    const encryptedValue = encrypt(`${guestName} (${email})`);
    await Promise.all(
      items.map((item) =>
        notion.pages.update({
          page_id: item.id,
          properties: {
            Claimed:   { checkbox: true },
            ClaimedBy: { rich_text: [{ text: { content: encryptedValue } }] },
          },
        })
      )
    );
  }

  // ── Send email ────────────────────────────────────────────────────────────
  const fromAddress = process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from:    fromAddress,
    to:      email,
    subject: "Your picks from Jeffrey & Katie's Registry 💍",
    html:    buildEmail(guestName, items),
  });

  if (error) {
    console.error("[Registry] Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
