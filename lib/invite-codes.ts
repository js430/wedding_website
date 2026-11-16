/**
 * Short, typeable household codes (4 characters, e.g. K7QM).
 *
 * Pure: no Notion, no Node-only modules. The alphabet leaves out 0, 1, I, L
 * and O so a code read off a text message cannot be mistyped as a lookalike.
 */

export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 4;

/**
 * Uppercase and strip everything that is not A-Z / 0-9 ("k7-qm" → "K7QM").
 * Returns "" unless the result is exactly CODE_LENGTH characters, all in the alphabet.
 */
export function normalizeCode(input: string): string {
  if (typeof input !== "string") return "";
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) return "";
  for (let i = 0; i < code.length; i++) {
    if (CODE_ALPHABET.indexOf(code.charAt(i)) === -1) return "";
  }
  return code;
}

/** Uniform random index in [0, n) by rejection sampling (no modulo bias). */
function randomIndex(n: number): number {
  const limit = 256 - (256 % n);
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** A random code not in `taken`. Retries until one is free. */
export function generateCode(taken: Set<string>): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET.charAt(randomIndex(CODE_ALPHABET.length));
    if (!taken.has(code)) return code;
  }
}
