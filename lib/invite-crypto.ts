/**
 * Signing for the device cookie that the shared-password link (or typed
 * password) sets.
 *
 * Web Crypto only, no Node imports: middleware imports this file and may run
 * on the Edge runtime, where `crypto` / `Buffer` / `timingSafeEqual` are absent.
 *
 * The cookie is `${issuedAt}.${sig}`, where
 *   sig = HMAC-SHA256(INVITE_SECRET, "session:" + sha256hex(password) + ":" + issuedAt)
 *
 * The hash of the current SITE_PASSWORD is part of what is signed so that
 * changing SITE_PASSWORD makes every cookie already issued fail verification:
 * it signs every device out. That is the couple's only revoke switch.
 */

export const SESSION_COOKIE = "invite";

/**
 * Cookie lifetime: every device stays in until after the wedding.
 * Stored in UTC so it is the same instant regardless of server timezone.
 */
export const SESSION_EXPIRES = new Date("2027-06-01T00:00:00Z");

const encoder = new TextEncoder();

/** Case and surrounding whitespace never matter when comparing passwords. */
export function normalizePassword(s: string): string {
  return s.trim().toLowerCase();
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function sha256hex(s: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(s));
  return toHex(new Uint8Array(digest));
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

/** Both SITE_PASSWORD and INVITE_SECRET are set (and not blank). */
export function gateConfigured(): boolean {
  return Boolean(process.env.SITE_PASSWORD?.trim() && process.env.INVITE_SECRET);
}

async function sessionSignature(issuedAt: string): Promise<string | null> {
  const secret = process.env.INVITE_SECRET;
  const password = process.env.SITE_PASSWORD;
  if (!secret || !password || !normalizePassword(password)) return null;
  const passwordHash = await sha256hex(normalizePassword(password));
  return hmac(`session:${passwordHash}:${issuedAt}`, secret);
}

/** Cookie value `${issuedAt}.${sig}`, or "" when the gate is not configured. */
export async function signSession(issuedAt: number): Promise<string> {
  const sig = await sessionSignature(String(issuedAt));
  return sig ? `${issuedAt}.${sig}` : "";
}

/** True if the cookie is authentic for the current password. Never throws. */
export async function verifySession(value: string | undefined): Promise<boolean> {
  try {
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length !== 2) return false;
    const [issuedAt, sig] = parts;
    if (!issuedAt || !sig) return false;
    const expected = await sessionSignature(issuedAt);
    return expected !== null && safeEqual(sig, expected);
  } catch {
    return false;
  }
}

/** Does `input` match SITE_PASSWORD (ignoring case and surrounding whitespace)? */
export async function passwordMatches(input: string): Promise<boolean> {
  try {
    const password = process.env.SITE_PASSWORD;
    if (!password || typeof input !== "string") return false;
    const want = normalizePassword(password);
    const got = normalizePassword(input);
    if (!want || !got) return false;
    // Compare digests so length differences leak nothing.
    const [a, b] = await Promise.all([sha256hex(want), sha256hex(got)]);
    return safeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * The token in the shared invite link (/i/<token>); the link does not contain
 * the password. It is derived, not stored: the first 16 hex characters of
 * HMAC-SHA256(INVITE_SECRET, "link:" + sha256hex(password)). So it changes
 * automatically whenever SITE_PASSWORD or INVITE_SECRET changes (old links stop
 * working, same as the old design) and there is no extra setting. The "link:"
 * prefix keeps it distinct from session signatures. 64 bits plus the
 * wrong-guess block makes guessing impractical.
 */
export async function linkToken(): Promise<string> {
  if (!gateConfigured()) return "";
  const secret = process.env.INVITE_SECRET as string;
  const password = process.env.SITE_PASSWORD as string;
  const passwordHash = await sha256hex(normalizePassword(password));
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`link:${passwordHash}`),
  );
  return toHex(new Uint8Array(sig)).slice(0, 16);
}

/** Does `input` equal the current link token (case-insensitive)? Never throws. */
export async function linkTokenMatches(input: string): Promise<boolean> {
  try {
    if (typeof input !== "string") return false;
    const got = input.toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(got)) return false;
    const want = await linkToken();
    return want !== "" && safeEqual(got, want);
  } catch {
    return false;
  }
}
