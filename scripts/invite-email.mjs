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
  timeLine: "Doors open at 4:00\u00a0PM · Ceremony at 5:00\u00a0PM",
  venue: "The Forum Hotel",
  address: "540 Massie Rd, Charlottesville, VA 22903",
  rsvpBy: "January 27, 2027",
  // For the Google Calendar link (local time, America/New_York).
  gcal: { start: "20270327T160000", end: "20270327T230000", tz: "America/New_York" },
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
    details: "Doors open at 4:00 PM, ceremony at 5:00 PM. We can't wait to celebrate with you!",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/**
 * @param {object} o
 * @param {string} o.name      Greeting name, e.g. "Alex & Sam" or "the Lee family"
 * @param {string} o.link      The site's invite link (signs the guest in), e.g. https://www.jeffandkatie2027.com/i/abcd…
 * @param {string} o.password  The site password, for opening the site on another device
 * @param {string} o.siteUrl   e.g. https://www.jeffandkatie2027.com
 */
export function buildInviteEmail({ name, link, password, siteUrl }) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const calendarUrl = `${siteUrl.replace(/\/+$/, "")}/api/calendar`;
  const subject = "You're invited: Katie & Jeffrey · March 27, 2027";
  const preheader = `Join us in Charlottesville on ${WEDDING.dateLine}. Kindly reply by ${WEDDING.rsvpBy}.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FEE8EC;">
  <!-- Preview text shown next to the subject in the inbox -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#FFFFFF;">

        <!-- Header -->
        <tr>
          <td style="background:#1E0008;padding:40px 24px;text-align:center;">
            <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#c9a838;">
              You&rsquo;re invited
            </p>
            <p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:40px;line-height:1.15;color:#FEE8EC;">
              Katie &amp; Jeffrey
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 8px;text-align:center;">
            <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">
              Dear ${esc(name)},
            </p>
            <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:17px;line-height:1.6;color:#4a3728;">
              Together with our families, we joyfully invite you to celebrate our wedding.
            </p>

            <!-- Details -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8C9A0;border-bottom:1px solid #E8C9A0;">
              <tr>
                <td style="padding:22px 8px;text-align:center;">
                  <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8B0010;">
                    ${esc(WEDDING.dateLine)}
                  </p>
                  <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4a3728;">
                    ${esc(WEDDING.timeLine)}
                  </p>
                  <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#1E0008;">
                    ${esc(WEDDING.venue)}
                  </p>
                  <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4a3728;">
                    ${esc(WEDDING.address)}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto 12px;">
              <tr>
                <td style="background:#CC1428;">
                  <a href="${esc(link)}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">
                    View invitation &amp; RSVP
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4a3728;">
              Kindly reply by <strong>${esc(WEDDING.rsvpBy)}</strong>.
            </p>

            <!-- Password, for opening the site somewhere else -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;border:1px solid #FFB3C4;">
              <tr>
                <td style="padding:18px 20px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#4a3728;">
                  Our website is just for our guests. The button above lets you right in.
                  On another device, go to <strong>${esc(host)}</strong> and enter the password
                  <strong style="color:#8B0010;letter-spacing:0.05em;">${esc(password)}</strong>
                </td>
              </tr>
            </table>

            <!-- Calendar -->
            <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8B0010;">
              <a href="${esc(calendarUrl)}" style="color:#8B0010;text-decoration:underline;">Add to Apple/Outlook calendar</a>
              &nbsp;&middot;&nbsp;
              <a href="${esc(googleCalendarUrl())}" style="color:#8B0010;text-decoration:underline;">Add to Google Calendar</a>
            </p>

            <p style="margin:32px 0 6px;font-family:Georgia,serif;font-size:17px;line-height:1.6;color:#4a3728;">
              We can&rsquo;t wait to celebrate with you.
            </p>
            <p style="margin:0 0 32px;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#8B0010;">
              With love, Katie &amp; Jeffrey
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#FEE8EC;padding:18px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b4f45;">
            Questions? Just reply to this email.
          </td>
        </tr>
      </table>
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
    `Our website is just for our guests. The link above lets you right in. On another device, go to ${host} and enter the password: ${password}`,
    "",
    `Add to your calendar: ${calendarUrl}`,
    "",
    "We can't wait to celebrate with you.",
    "With love, Katie & Jeffrey",
    "",
    "Questions? Just reply to this email.",
  ].join("\n");

  return { subject, html, text };
}
