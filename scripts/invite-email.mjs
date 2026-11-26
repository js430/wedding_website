/**
 * The invitation email: subject, HTML and plain text.
 *
 * Used by scripts/send-invites.mjs. The wedding details below mirror
 * lib/event.ts (date, times, venue) and the RSVP deadline on the site; if
 * one changes, change both.
 */

const WEDDING = {
  dateLine: "Saturday, March 27, 2027",
  // Non-breaking spaces keep "5:00 PM" together on narrow screens.
  timeLine: "Doors open at 4:30\u00a0PM · Ceremony at 5:00\u00a0PM",
  venue: "The Forum Hotel",
  address: "540 Massie Rd, Charlottesville, VA 22903",
  rsvpBy: "January 27, 2027",
  // For the Google Calendar link (local time, America/New_York).
  gcal: { start: "20270327T163000", end: "20270327T230000", tz: "America/New_York" },
};

/** Escape text for HTML (names come from your guest list). */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function googleCalendarUrl() {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: "Katie & Jeffrey's Wedding",
    dates: `${WEDDING.gcal.start}/${WEDDING.gcal.end}`,
    ctz: WEDDING.gcal.tz,
    location: `${WEDDING.venue}, ${WEDDING.address}`,
    details: "Doors open at 4:30 PM, ceremony at 5:00 PM. We can't wait to celebrate with you!",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/**
 * @param {object} o
 * @param {string} o.name      Greeting name, e.g. "Alex & Sam" or "the Lee family"
 * @param {string} o.link      The site's invite link (signs the guest in), e.g. https://www.jeffandkatie2027.com/i/abcd…
 * @param {string} o.password  The site password, for opening the site on another device
 * @param {string} o.siteUrl   e.g. https://www.jeffandkatie2027.com
 * @param {string} [o.unsubscribeUrl]  Adds an opt-out link to the footer (Resend Broadcasts
 *                                     pass "{{{RESEND_UNSUBSCRIBE_URL}}}")
 */
export function buildInviteEmail({ name, link, password, siteUrl, unsubscribeUrl }) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const calendarUrl = `${siteUrl.replace(/\/+$/, "")}/api/calendar`;
  const subject = "You're invited: Katie & Jeffrey · March 27, 2027";
  const preheader = `Join us in Charlottesville on ${WEDDING.dateLine}. Kindly reply by ${WEDDING.rsvpBy}.`;
  // Resend placeholders ({{{…}}}) pass through escaping untouched.
  const optOutHtml = unsubscribeUrl
    ? `<br><a href="${esc(unsubscribeUrl)}" style="color:#8B0010;text-decoration:underline;">Prefer not to get wedding emails?</a>`
    : "";
  const optOutText = unsubscribeUrl ? `\nPrefer not to get wedding emails? ${unsubscribeUrl}` : "";

  // Same look as the site's own emails (lib/email-layout.ts).
  const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
  const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#FEE8EC;-webkit-text-size-adjust:100%;">
  <!-- Preview text shown next to the subject in the inbox -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border-collapse:separate;">

        <!-- Header -->
        <tr>
          <td style="background:#1E0008;padding:46px 24px 40px;text-align:center;">
            <p style="margin:0 0 14px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:0.32em;text-transform:uppercase;color:#c9a838;">
              You&rsquo;re invited
            </p>
            <p style="margin:0;font-family:${SERIF};font-style:italic;font-size:44px;line-height:1.15;color:#FEE8EC;">
              Katie &amp; Jeffrey
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 0;"><tr><td style="width:48px;height:1px;background:#c9a838;font-size:0;line-height:0;">&nbsp;</td></tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:38px 28px 10px;text-align:center;">
            <p style="margin:0 0 16px;font-family:${SERIF};font-size:22px;line-height:1.3;color:#1E0008;">
              Dear ${esc(name)},
            </p>
            <p style="margin:0 0 30px;font-family:${SERIF};font-size:18px;line-height:1.65;color:#3d2a22;">
              Together with our families, we joyfully invite you to celebrate our wedding.
            </p>

            <!-- Details -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;border-radius:12px;">
              <tr>
                <td style="padding:26px 16px;text-align:center;">
                  <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;color:#8B0010;">
                    ${esc(WEDDING.dateLine)}
                  </p>
                  <p style="margin:0 0 18px;font-family:${SANS};font-size:14px;line-height:1.6;color:#3d2a22;">
                    ${WEDDING.timeLine.split(" · ").map((t) => `<span style="white-space:nowrap;">${esc(t)}</span>`).join(" &middot; ")}
                  </p>
                  <p style="margin:0;font-family:${SERIF};font-size:20px;line-height:1.4;color:#1E0008;">
                    ${esc(WEDDING.venue)}
                  </p>
                  <p style="margin:4px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:#3d2a22;">
                    ${esc(WEDDING.address).replace(/, ([^,]+, [A-Z]{2} \d{5})$/, ', <span style="white-space:nowrap;">$1</span>')}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 14px;border-collapse:separate;">
              <tr>
                <td style="background:#CC1428;border-radius:999px;">
                  <a href="${esc(link)}" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:13px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:999px;">
                    View invitation &amp; RSVP
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 30px;font-family:${SANS};font-size:14px;color:#3d2a22;">
              Kindly reply by <strong style="color:#1E0008;">${esc(WEDDING.rsvpBy)}</strong>
            </p>

            <!-- Password, for opening the site somewhere else -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #F4CDD5;border-radius:12px;border-collapse:separate;">
              <tr>
                <td style="padding:18px 20px;text-align:center;font-family:${SANS};font-size:13px;line-height:1.65;color:#7a5c52;">
                  Our website is just for our guests, and the button above lets you right in.
                  On another device, go to <strong style="color:#1E0008;">${esc(host)}</strong> and enter the password
                  <strong style="color:#8B0010;letter-spacing:0.04em;white-space:nowrap;">${esc(password)}</strong>
                </td>
              </tr>
            </table>

            <!-- Calendar -->
            <p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:#8B0010;">
              <a href="${esc(calendarUrl)}" style="color:#8B0010;text-decoration:underline;">Add to Apple / Outlook</a>
              &nbsp;&middot;&nbsp;
              <a href="${esc(googleCalendarUrl())}" style="color:#8B0010;text-decoration:underline;">Add to Google Calendar</a>
            </p>

            <p style="margin:34px 0 4px;font-family:${SERIF};font-size:18px;line-height:1.6;color:#3d2a22;">
              We can&rsquo;t wait to celebrate with you.
            </p>
            <p style="margin:0 0 34px;font-family:${SERIF};font-style:italic;font-size:24px;color:#8B0010;">
              With love, Katie &amp; Jeffrey
            </p>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <p style="margin:20px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#8B0010;text-align:center;">
        Questions? Just reply to this email.${optOutHtml}
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Dear ${name},`,
    "",
    "Together with our families, we joyfully invite you to celebrate our wedding.",
    "",
    WEDDING.dateLine,
    WEDDING.timeLine,
    `${WEDDING.venue}, ${WEDDING.address}`,
    "",
    `View the invitation and RSVP (kindly reply by ${WEDDING.rsvpBy}):`,
    link,
    "",
    `Our website is just for our guests, and the link above lets you right in. On another device, go to ${host} and enter the password: ${password}`,
    "",
    `Add to your calendar: ${calendarUrl}`,
    "",
    "We can't wait to celebrate with you.",
    "With love, Katie & Jeffrey",
    "",
    `Questions? Just reply to this email.${optOutText}`,
  ].join("\n");

  return { subject, html, text };
}
