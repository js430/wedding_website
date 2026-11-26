import { escapeHtml } from "@/lib/input";

/**
 * Shared look for every email the site sends (RSVP confirmation, RSVP link,
 * registry picks), so they read as one set. Table-based with inline styles,
 * which is what email clients reliably render.
 *
 * Text passed to these helpers is escaped unless the parameter says html.
 */

export const C = {
  blush:    "#FEE8EC",
  soft:     "#FFB3C4",
  line:     "#F4CDD5",
  deep:     "#CC1428",
  dark:     "#8B0010",
  darkest:  "#1E0008",
  gold:     "#c9a838",
  goldDark: "#7a6312",
  ink:      "#3d2a22",
  muted:    "#7a5c52",
};

export const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
export const SANS  = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const multiline = (s: string) => escapeHtml(s).replace(/\r?\n/g, "<br>");

/** "Hi Alex," — first name only, or "Hi there," without one. */
export function greeting(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return `<p style="margin:0 0 14px;font-family:${SERIF};font-size:22px;line-height:1.3;color:${C.darkest};">Hi ${first ? escapeHtml(first) : "there"},</p>`;
}

/** A body paragraph. `html` is inserted as is (escape anything from guests). */
export function para(html: string, o: { size?: number; color?: string; align?: "left" | "center"; margin?: string } = {}): string {
  return `<p style="margin:${o.margin ?? "0 0 18px"};font-family:${SANS};font-size:${o.size ?? 15}px;line-height:1.7;color:${o.color ?? C.ink};text-align:${o.align ?? "left"};">${html}</p>`;
}

/** Small uppercase label, e.g. above a card. */
export function eyebrow(text: string, color = C.dark): string {
  return `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
}

/** A solid, rounded button that survives Outlook (the cell carries the colour). */
export function button(href: string, label: string, o: { small?: boolean; outline?: boolean } = {}): string {
  const pad = o.small ? "9px 18px" : "14px 30px";
  const size = o.small ? 12 : 13;
  const bg = o.outline ? "#FFFFFF" : C.deep;
  const fg = o.outline ? C.deep : "#FFFFFF";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;border-collapse:separate;"><tr>
    <td style="background:${bg};border:1px solid ${C.deep};border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:${pad};font-family:${SANS};font-size:${size}px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:${fg};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

/** Label-over-value rows inside a soft card (stacks well on phones). */
export function details(rows: { label: string; value: string }[]): string {
  if (!rows.length) return "";
  const cells = rows.map((r, i) => `
    <tr><td style="padding:${i ? "14px" : "0"} 0 0;${i ? `border-top:1px solid ${C.line};` : ""}">
      <p style="margin:0 0 3px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:0.16em;text-transform:uppercase;color:${C.dark};">${escapeHtml(r.label)}</p>
      <p style="margin:0 0 ${i === rows.length - 1 ? "0" : "14px"};font-family:${SERIF};font-size:17px;line-height:1.45;color:${C.darkest};">${multiline(r.value)}</p>
    </td></tr>`).join("");
  return card(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>`);
}

/** Soft blush panel. */
export function card(innerHtml: string, o: { align?: "left" | "center"; margin?: string } = {}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:${o.margin ?? "0 0 24px"};background:${C.blush};border-radius:12px;">
    <tr><td style="padding:22px 24px;text-align:${o.align ?? "left"};">${innerHtml}</td></tr>
  </table>`;
}

/** Date, time, venue and calendar links: the same block in every email that needs it. */
export function eventBlock(o: { icsUrl: string; googleUrl: string }): string {
  return card(`
    ${eyebrow("The day")}
    <p style="margin:0 0 2px;font-family:${SERIF};font-size:19px;line-height:1.4;color:${C.darkest};">Saturday, March 27, 2027</p>
    <p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};"><span style="white-space:nowrap;">Doors open at 4:30&nbsp;PM</span> &middot; <span style="white-space:nowrap;">Ceremony at 5:00&nbsp;PM</span></p>
    <p style="margin:0 0 2px;font-family:${SERIF};font-size:17px;line-height:1.4;color:${C.darkest};">The Forum Hotel</p>
    <p style="margin:0 0 16px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};">540 Massie Rd, <span style="white-space:nowrap;">Charlottesville, VA 22903</span></p>
    <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.dark};">
      <a href="${escapeHtml(o.icsUrl)}" style="color:${C.dark};text-decoration:underline;">Add to Apple / Outlook</a>
      &nbsp;&middot;&nbsp;
      <a href="${escapeHtml(o.googleUrl)}" style="color:${C.dark};text-decoration:underline;">Add to Google Calendar</a>
    </p>`);
}

/** "With love, Katie & Jeffrey" */
export function signoff(): string {
  return `<p style="margin:30px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink};">With love,</p>
    <p style="margin:2px 0 0;font-family:${SERIF};font-style:italic;font-size:22px;line-height:1.3;color:${C.dark};">Katie &amp; Jeffrey</p>`;
}

/**
 * The full email: header with names and title, white card body, footer.
 * `preheader` is the grey preview line inboxes show after the subject.
 */
export function emailLayout(o: { title: string; kicker: string; preheader: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.blush};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(o.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.blush};">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border-collapse:separate;">
        <tr>
          <td style="background:${C.darkest};padding:40px 28px 36px;text-align:center;">
            <p style="margin:0 0 12px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:0.32em;text-transform:uppercase;color:${C.gold};">${escapeHtml(o.kicker)}</p>
            <h1 style="margin:0;font-family:${SERIF};font-style:italic;font-weight:normal;font-size:34px;line-height:1.2;color:${C.blush};">${escapeHtml(o.title)}</h1>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0;"><tr><td style="width:48px;height:1px;background:${C.gold};font-size:0;line-height:0;">&nbsp;</td></tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 28px 36px;">
            ${o.bodyHtml}
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;letter-spacing:0.04em;color:${C.dark};text-align:center;">
        Katie &amp; Jeffrey &middot; March 27, 2027 &middot; Charlottesville, VA
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
