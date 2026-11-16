import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed "seating_auth" cookie. Node runtime only.
 *
 * The cookie value is `${issuedAt}.${hmac}`. The HMAC key is SEATING_PASSWORD,
 * so changing the password invalidates every cookie and logs every device out.
 */

export const SEATING_COOKIE = "seating_auth";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function mac(issuedAt: number): string {
  return createHmac("sha256", process.env.SEATING_PASSWORD ?? "")
    .update(`seating:${issuedAt}`)
    .digest("hex");
}

export function signSeating(issuedAt: number): string {
  return `${issuedAt}.${mac(issuedAt)}`;
}

export function isSeatingAuthed(value: string | undefined): boolean {
  if (!process.env.SEATING_PASSWORD || !value) return false;
  const m = /^(\d{1,15})\.([0-9a-f]{64})$/.exec(value);
  if (!m) return false;
  const issuedAt = Number(m[1]);
  const age = Date.now() - issuedAt;
  // Too old, or issued implausibly far in the future.
  if (age > MAX_AGE_MS || age < -60_000) return false;
  const a = Buffer.from(m[2]);
  const b = Buffer.from(mac(issuedAt));
  return a.length === b.length && timingSafeEqual(a, b);
}
