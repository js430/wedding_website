/**
 * The wedding itself — one source of truth for the date, venue and the
 * calendar files generated from them.
 */

export const EVENT = {
  title:    "Jeffrey & Katie's Wedding",
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

export function buildIcs(now: Date = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jeffrey and Katie//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:wedding-2027-03-27@jeffreyandkatie`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${EVENT.timeZone}:${stamp(EVENT.start)}`,
    `DTEND;TZID=${EVENT.timeZone}:${stamp(EVENT.end)}`,
    `SUMMARY:${EVENT.title}`,
    `LOCATION:${EVENT.venue}\\, ${EVENT.address}`,
    `DESCRIPTION:${EVENT.details}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join(CRLF);
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
