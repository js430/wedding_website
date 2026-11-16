/**
 * Signing for the personal invite links and the device cookie they set.
 *
 * Web Crypto only, no Node imports: middleware imports this file and may run
 * on the Edge runtime, where `crypto` / `Buffer` / `timingSafeEqual` are absent.
 *
 * Two kinds of signed value, both keyed with INVITE_SECRET:
 *   - link code:      HMAC("invite:"  + id)                 → 12 chars, in the URL
 *   - session cookie: HMAC("session:" + id + ":" + issuedAt) → full length
 * The "invite:" and "session:" prefixes keep the two from being
 * interchangeable: a link code can never be replayed as a cookie signature,
 * and a cookie signature can never be used as a link code.
 */

export const SESSION_COOKIE = "invite";

/**
 * Cookie lifetime: every device stays in until after the wedding.
 * Stored in UTC so it is the same instant regardless of server timezone.
 */
export const SESSION_EXPIRES = new Date("2027-06-01T00:00:00Z");

const encoder = new TextEncoder();

/** Lowercase, dashes removed: Notion returns ids with dashes, humans paste them without. */
export function normalizeId(pageId: string): string {
  return pageId.toLowerCase().replace(/-/g, "");
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

/** Constant-time string comparison (no timingSafeEqual on the Edge). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The 12-character code in a household's personal link. Returns "" when no
 * signing secret is set, so an unsigned code is never issued.
 */
export async function inviteCode(pageId: string): Promise<string> {
  const secret = process.env.INVITE_SECRET;
  if (!secret) return "";
  return (await hmac("invite:" + normalizeId(pageId), secret)).slice(0, 12);
}

/** Cookie value `${id}.${issuedAt}.${sig}`, or "" when no secret is set. */
export async function signSession(pageId: string, issuedAt: number): Promise<string> {
  const secret = process.env.INVITE_SECRET;
  if (!secret) return "";
  const id = normalizeId(pageId);
  return `${id}.${issuedAt}.${await hmac(`session:${id}:${issuedAt}`, secret)}`;
}

/** Normalized page id if the cookie is authentic, else null. Never throws. */
export async function verifySession(value: string | undefined): Promise<string | null> {
  try {
    const secret = process.env.INVITE_SECRET;
    if (!secret || !value) return null;
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const [id, issuedAt, sig] = parts;
    if (!id || !issuedAt || !sig) return null;
    const expected = await hmac(`session:${id}:${issuedAt}`, secret);
    return safeEqual(sig, expected) ? id : null;
  } catch {
    return null;
  }
}
