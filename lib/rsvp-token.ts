import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed links that let a guest edit their own RSVP.
 *
 * The token carries the Notion page id and is signed with REGISTRY_CLAIM_KEY,
 * so a guest can only reach the row the link was minted for. Nothing is stored
 * server-side: the signature is the whole check.
 */

/**
 * Guests can change their answer up to this instant.
 * Stored in UTC: 2027-02-28T04:59:59Z is 11:59:59 PM on Feb 27 in
 * America/New_York (EST, UTC-5), so the deadline lands at the end of the
 * 27th in the wedding's own timezone rather than the viewer's.
 */
export const RSVP_EDIT_DEADLINE = new Date("2027-02-28T04:59:59Z");

export function editingClosed(now: Date = new Date()): boolean {
  return now > RSVP_EDIT_DEADLINE;
}

/** "February 27, 2027" — for prose in emails and on the page. */
export function formatDeadline(): string {
  return RSVP_EDIT_DEADLINE.toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
    timeZone: "America/New_York",
  });
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Mint a token for one RSVP row. Returns "" when no signing key is set, which
 * callers treat as "no edit link available" rather than issuing an unsigned one.
 */
export function createEditToken(pageId: string): string {
  const secret = process.env.REGISTRY_CLAIM_KEY;
  if (!secret) return "";

  const payload = Buffer.from(pageId, "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Page id if the token is authentic, else null. */
export function verifyEditToken(token: string): string | null {
  const secret = process.env.REGISTRY_CLAIM_KEY;
  if (!secret || !token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Compare in constant time; mismatched lengths can never be equal anyway.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return Buffer.from(payload, "base64url").toString("utf8");
}

/** Absolute URL a guest follows to edit, or "" when no token could be made. */
export function buildEditUrl(pageId: string, origin: string): string {
  const token = createEditToken(pageId);
  return token ? `${origin}/rsvp/edit?token=${encodeURIComponent(token)}` : "";
}
