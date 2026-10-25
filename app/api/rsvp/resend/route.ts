import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { buildEditUrl, formatDeadline } from "@/lib/rsvp-token";
import { allow } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Re-send a guest their RSVP edit link, matched on the email they RSVPed with.
 *
 * The response is deliberately identical whether or not that email is in the
 * guest list, so this cannot be used to test who was invited.
 */

const WINDOW_MS   = 15 * 60 * 1000;
const PER_EMAIL   = 3;   // a guest retrying is fine; a script hammering one address is not
const PER_CLIENT  = 10;  // across all addresses from one IP

function buildResendEmail(name: string, editUrl: string): string {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
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
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">Your RSVP Link</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:center;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1E0008;text-align:left;">${greeting}</p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;text-align:left;">
                  Here's the link to view or change your RSVP. You can make changes
                  until <strong>${formatDeadline()}</strong>.
                </p>
                <a href="${editUrl}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:12px 26px;display:inline-block;">
                  Open my RSVP
                </a>
                <p style="margin:18px 0 0;font-family:sans-serif;font-size:11px;color:#8B0010;">
                  This link is just for you — please don't forward it. If you didn't
                  ask for it, you can ignore this email.
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
  const { email } = await req.json().catch(() => ({ email: "" }));
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Same body for every outcome below, so nothing distinguishes a hit from a miss.
  const ok = NextResponse.json({ ok: true });

  if (!address || !address.includes("@")) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(`ip:${ip}`, PER_CLIENT, WINDOW_MS) || !allow(`em:${address}`, PER_EMAIL, WINDOW_MS)) {
    // Also a 200: a distinct 429 would leak that the address is being retried.
    console.warn("[RSVP resend] rate limited", { ip });
    return ok;
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID || !process.env.RESEND_API_KEY) {
    console.warn("[RSVP resend] not configured — skipping");
    return ok;
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const found = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: { property: "Email", email: { equals: address } },
      sorts:  [{ property: "Submitted At", direction: "descending" }],
      page_size: 1,
    });

    const page: any = found.results[0];
    if (!page) {
      console.info("[RSVP resend] no RSVP for that address");
      return ok;
    }

    const name    = page.properties?.Name?.title?.[0]?.plain_text ?? "";
    const origin  = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const editUrl = buildEditUrl(page.id, origin);
    if (!editUrl) {
      console.warn("[RSVP resend] REGISTRY_CLAIM_KEY not set — cannot mint link");
      return ok;
    }

    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from:    process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>",
      to:      address,
      subject: "Your RSVP link — Jeffrey & Katie",
      html:    buildResendEmail(name, editUrl),
    });
  } catch (err: any) {
    // Never surface the failure: the response must not vary by outcome.
    console.error("[RSVP resend] failed:", err?.message ?? err);
  }

  return ok;
}
