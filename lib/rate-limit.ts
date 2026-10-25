/**
 * Tiny fixed-window rate limiter, held in process memory.
 *
 * Good enough to blunt scripted abuse of the public resend endpoint on a
 * single instance. It is NOT a security boundary: counters reset on deploy
 * and are not shared between instances, so scaling past one web service
 * means moving this to a shared store.
 */

interface Bucket {
  count: number;
  /** When the current window expires, in ms since epoch. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired windows so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  // forEach rather than for..of: this project targets ES5.
  const expired: string[] = [];
  buckets.forEach((w, key) => {
    if (w.resetAt <= now) expired.push(key);
  });
  expired.forEach((key) => buckets.delete(key));
}

/** True when this key is still under its limit; counts the attempt. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Test seam — drops all counters. */
export function resetRateLimits() {
  buckets.clear();
}
