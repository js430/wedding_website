import { NextRequest, NextResponse } from "next/server";

/**
 * Small helpers for handling what guests send to the API routes. Everything a
 * guest types can end up in an email or in Notion, so it is trimmed, capped
 * and (for email HTML) escaped.
 */

/** Escape text for safe use inside HTML, including attribute values. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A trimmed string capped at `max` characters; "" for anything that isn't a string. */
export function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Lower-cased, trimmed email address, or "" when it doesn't look like one. */
export function cleanEmail(value: unknown): string {
  const v = cleanText(value, 254).toLowerCase();
  return EMAIL.test(v) ? v : "";
}

/**
 * The request's JSON body as an object, or a ready-made 400 response when the
 * body is missing, malformed or not an object.
 */
export async function readJson(
  req: NextRequest,
): Promise<{ body: Record<string, unknown>; error?: undefined } | { body?: undefined; error: NextResponse }> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return { body };
  } catch {
    // fall through
  }
  return { error: NextResponse.json({ error: "bad-request" }, { status: 400 }) };
}

const locks = new Map<string, Promise<unknown>>();

/**
 * Run `fn` only after any earlier call with the same key has finished, so two
 * requests for the same thing (one guest's email, one gift) can't interleave
 * a check-then-write. In-process only: enough for the single web instance
 * this site runs on.
 */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  try {
    return await run;
  } finally {
    if (locks.get(key) === tail) locks.delete(key);
  }
}
