import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { clientKey } from "@/lib/invite-guard";

/**
 * Checks for the private passwords (admin pages, seating chart, registry
 * decrypt). Comparison is constant-time, and a network that gets one wrong
 * 10 times in 15 minutes is refused until the window passes, so the
 * passwords can't be guessed by brute force.
 */

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

/** Constant-time string comparison (hashing first evens out the lengths). */
export function secretMatches(given: unknown, expected: string | undefined): boolean {
  if (typeof given !== "string" || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * null when `given` is the right password; otherwise the response to send
 * (500 not configured, 429 too many wrong tries, 401 wrong).
 */
export function checkSecret(
  req: NextRequest,
  scope: string,
  given: unknown,
  expected: string | undefined,
  name: string,
): NextResponse | null {
  if (!expected) {
    return NextResponse.json({ error: `${name} not configured` }, { status: 500 });
  }

  const key = `${scope}:${clientKey(req)}`;
  const now = Date.now();
  const entry = failures.get(key);
  if (entry && entry.resetAt <= now) failures.delete(key);
  const current = failures.get(key);

  if (current && current.count >= MAX_FAILURES) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "too-many-attempts", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (secretMatches(given, expected)) return null;

  if (current) current.count += 1;
  else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  if (failures.size > 1000) {
    failures.forEach((v, k) => { if (v.resetAt <= now) failures.delete(k); });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** The admin password from the x-admin-password header. */
export function checkAdmin(req: NextRequest): NextResponse | null {
  return checkSecret(req, "admin", req.headers.get("x-admin-password") ?? "", process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD");
}
