import { Resend } from "resend";

export const INVITE_EMAIL_SUBJECT = "Your invitation — Katie & Jeffrey 💌";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInviteEmail(name: string, url: string, code?: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const href = escapeHtml(url);
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  const codeBlock =
    code && host
      ? `<p style="margin:22px 0 6px;font-family:sans-serif;font-size:13px;color:#4a3728;line-height:1.6;">
                  On a computer? Go to <strong>${escapeHtml(host)}</strong> and enter your code:
                </p>
                <p style="margin:0;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:0.3em;color:#1E0008;">${escapeHtml(code)}</p>`
      : "";
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
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">You're Invited</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:center;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1E0008;text-align:left;">${greeting}</p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;text-align:left;">
                  We're so happy to celebrate with you! This is your personal link to
                  our wedding website, where you'll find all the details and can RSVP.
                </p>
                <a href="${href}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:12px 26px;display:inline-block;">
                  Open the website
                </a>
                ${codeBlock}
                <p style="margin:18px 0 0;font-family:sans-serif;font-size:13px;color:#4a3728;line-height:1.6;">
                  Your link works on any of your devices — phone, computer, tablet —
                  and you can open it again from this email anytime.
                </p>
                <p style="margin:12px 0 0;font-family:sans-serif;font-size:11px;color:#8B0010;">
                  This link is just for your household — please don't share it.
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

/** Email a household their personal link. Never throws. */
export async function sendInviteEmail(
  to: string,
  name: string,
  url: string,
  code?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.REGISTRY_FROM_EMAIL ?? "Katie & Jeffrey <onboarding@resend.dev>",
      to,
      subject: INVITE_EMAIL_SUBJECT,
      html: buildInviteEmail(name, url, code),
    });
    if (error) return { ok: false, error: error.message ?? String(error) };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}
