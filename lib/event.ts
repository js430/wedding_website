/**
 * The wedding itself — one source of truth for the date, venue and the
 * calendar files generated from them.
 */

export const EVENT = {
  title:    "Katie & Jeffrey's Wedding",
  /** Doors open; the ceremony begins at 5:00 PM. */
  start:    "2027-03-27T16:00:00",
  end:      "2027-03-27T23:00:00",
  timeZone: "America/New_York",
  venue:    "The Forum Hotel",
  address:  "540 Massie Rd, Charlottesville, VA 22903",
  details:  "Doors open at 4:00 PM, ceremony at 5:00 PM. We can't wait to celebrate with you!",
} as const;

/** "20270327T160000" — local time, paired with a TZID in the VEVENT. */
function stamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(".000", "");
}

/** UTC stamp for DTSTAMP, which must be absolute. */
function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * A minimal VCALENDAR. RFC 5545 requires CRLF line endings and Outlook
 * rejects LF-only files.
 *
 * CRLF is built with fromCharCode rather than written as "\r\n": the
 * production minifier inlines literal strings into template literals, and
 * JavaScript normalizes a real CRLF inside a template literal to LF, which
 * silently strips every CR from the built output.
 */
const CRLF = String.fromCharCode(13, 10);

/** Escape text for an iCalendar value (backslash, comma, semicolon, newline). */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/** Fold a content line at 75 octets, as RFC 5545 asks. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of Array.from(line)) {
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (enc.encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join(CRLF + " ");
}

/** America/New_York, so calendars that don't know the zone id still get the times right. */
const NEW_YORK_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildIcs(now: Date = new Date()): string {
  return [
    ...[

    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Katie and Jeffrey//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(EVENT.timeZone === "America/New_York" ? NEW_YORK_VTIMEZONE : []),
    "BEGIN:VEVENT",
    `UID:wedding-2027-03-27@jeffreyandkatie`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${EVENT.timeZone}:${stamp(EVENT.start)}`,
    `DTEND;TZID=${EVENT.timeZone}:${stamp(EVENT.end)}`,
    `SUMMARY:${icsText(EVENT.title)}`,
    `LOCATION:${icsText(`${EVENT.venue}, ${EVENT.address}`)}`,
    `DESCRIPTION:${icsText(EVENT.details)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ].map(fold),
  ].join(CRLF) + CRLF;
}

/** Google Calendar prefilled-event URL, for guests who live in a browser. */
export function googleCalendarUrl(): string {
  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     EVENT.title,
    dates:    `${stamp(EVENT.start)}/${stamp(EVENT.end)}`,
    ctz:      EVENT.timeZone,
    details:  EVENT.details,
    location: `${EVENT.venue}, ${EVENT.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
