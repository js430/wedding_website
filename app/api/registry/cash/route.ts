import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

// Update these in Railway env vars
const PAYMENT_DETAILS: Record<string, string> = {
  venmo:  process.env.VENMO_HANDLE  ?? "@your-venmo-handle",
  paypal: process.env.PAYPAL_EMAIL  ?? "your@paypal.email",
  zelle:  process.env.ZELLE_EMAIL   ?? "your@zelle.email",
};

const METHOD_LABELS: Record<string, string> = {
  venmo:  "Venmo",
  paypal: "PayPal",
  zelle:  "Zelle",
  cash:   "Cash (on the day of)",
};

function buildEmail(guestName: string, amount: string, method: string, note: string): string {
  const isDigital = method !== "cash";
  const detail    = PAYMENT_DETAILS[method];
  const label     = METHOD_LABELS[method] ?? method;

  const paymentBlock = isDigital
    ? `<p style="margin:16px 0;font-family:sans-serif;font-size:14px;color:#4a3728;">
        Send via <strong>${label}</strong> to: <strong style="color:#CC1428;">${detail}</strong>
       </p>`
    : `<p style="margin:16px 0;font-family:sans-serif;font-size:14px;color:#4a3728;">
        You've chosen to give cash on the day — we'll look forward to seeing you there!
       </p>`;

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
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">Thank You for Your Gift</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">Hi ${guestName},</p>
                <p style="margin:0 0 16px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;">
                  Your generosity means so much to us. Here are your contribution details:
                </p>
                <table style="width:100%;border-top:1px solid #FFB3C4;border-bottom:1px solid #FFB3C4;margin:16px 0;padding:12px 0;">
                  <tr>
                    <td style="font-family:sans-serif;font-size:13px;color:#8B0010;padding:6px 0;">Amount</td>
                    <td style="font-family:sans-serif;font-size:13px;color:#1E0008;text-align:right;padding:6px 0;">${amount ? `$${amount}` : "Your choice"}</td>
                  </tr>
                  <tr>
                    <td style="font-family:sans-serif;font-size:13px;color:#8B0010;padding:6px 0;">Method</td>
                    <td style="font-family:sans-serif;font-size:13px;color:#1E0008;text-align:right;padding:6px 0;">${label}</td>
                  </tr>
                </table>
                ${paymentBlock}
                ${note ? `<p style="margin:16px 0 0;font-family:sans-serif;font-size:13px;color:#4a3728;font-style:italic;">"${note}"</p>` : ""}
                <p style="margin:24px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  We can't wait to celebrate with you!
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
  const { guestName, email, amount, method, note } = await req.json();

  if (!email || !method) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const fromAddress = process.env.REGISTRY_FROM_EMAIL ?? "Jeffrey & Katie <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from:    fromAddress,
    to:      email,
    subject: "Thank you for your gift — Jeffrey & Katie 💍",
    html:    buildEmail(guestName, amount, method, note),
  });

  if (error) {
    console.error("[CashFund] Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
