/**
 * Wrong-guess block for invite codes (the typed box and /i/<code> links).
 *
 * 5 wrong attempts within a rolling hour block that client for 1 hour. If the
 * same client is blocked again within 24 hours of its previous block ending,
 * the new block lasts 24 hours. "Harder, not lockdown": it only slows guessing.
 *
 * State lives in process memory: it resets on deploy/restart and is per
 * instance, like lib/rate-limit.ts.
 *
 * A correct code deliberately does NOT clear strikes; they only expire with
 * the window. Otherwise anyone holding one valid code could reset their count
 * and keep guessing other households' codes.
 */

const HOUR = 60 * 60 * 1000;
const WINDOW_MS = HOUR;
const MAX_WRONG = 5;
const BLOCK_MS = HOUR;
const REPEAT_WINDOW_MS = 24 * HOUR;
const REPEAT_BLOCK_MS = 24 * HOUR;

interface Entry {
  /** Timestamps of wrong attempts inside the rolling window. */
  wrong: number[];
  blockedUntil: number;
  /** When the most recent block ended (0 if never blocked). */
  lastBlockEnd: number;
}

const entries = new Map<string, Entry>();

/**
 * Who is asking. Prefer the headers a CDN/proxy sets for the real visitor
 * (cf-connecting-ip, true-client-ip), then the first X-Forwarded-For value.
 * Keying on these never lumps all guests under one shared proxy address (which
 * would let 5 wrong guesses lock out everyone), at the cost that a determined
 * attacker can spoof headers to evade the block; acceptable, the couple asked
 * for "harder, not lockdown". Falls back to "unknown", which is never blocked.
 */
export function clientKey(req: { headers: { get(name: string): string | null } }): string {
  const h = (n: string) => req.headers.get(n)?.trim() || "";
  return (
    h("cf-connecting-ip") ||
    h("true-client-ip") ||
    h("x-forwarded-for").split(",")[0].trim() ||
    "unknown"
  );
}

function sweep(now: number) {
  if (entries.size < 500) return;
  const dead: string[] = [];
  entries.forEach((e, key) => {
    const recent = e.wrong.some((t) => now - t < WINDOW_MS);
    if (!recent && e.blockedUntil <= now && now - e.lastBlockEnd >= REPEAT_WINDOW_MS) dead.push(key);
  });
  dead.forEach((key) => entries.delete(key));
}

export function isBlocked(
  key: string,
  now: number = Date.now(),
): { blocked: boolean; retryAfterSeconds: number } {
  const e = key === "unknown" ? undefined : entries.get(key);
  if (!e || e.blockedUntil <= now) return { blocked: false, retryAfterSeconds: 0 };
  return { blocked: true, retryAfterSeconds: Math.ceil((e.blockedUntil - now) / 1000) };
}

/** Count one wrong attempt; the 5th inside the window starts a block. */
export function recordWrong(key: string, now: number = Date.now()): void {
  if (key === "unknown") return;
  sweep(now);

  let e = entries.get(key);
  if (!e) {
    e = { wrong: [], blockedUntil: 0, lastBlockEnd: 0 };
    entries.set(key, e);
  }
  if (e.blockedUntil > now) return; // already blocked; nothing more to count

  e.wrong = e.wrong.filter((t) => now - t < WINDOW_MS);
  e.wrong.push(now);
  if (e.wrong.length >= MAX_WRONG) {
    const repeat = e.lastBlockEnd > 0 && now - e.lastBlockEnd < REPEAT_WINDOW_MS;
    e.blockedUntil = now + (repeat ? REPEAT_BLOCK_MS : BLOCK_MS);
    e.lastBlockEnd = e.blockedUntil;
    e.wrong = [];
  }
}

/** Test seam: drop all state. */
export function resetGuard() {
  entries.clear();
}
