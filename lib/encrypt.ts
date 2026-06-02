import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(secret: string): Buffer {
  // Hash the key to always get exactly 32 bytes regardless of key length
  return createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  const secret = process.env.REGISTRY_CLAIM_KEY;
  if (!secret) return text; // No key set — store plaintext (fallback)

  const key = getKey(secret);
  const iv  = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(encoded: string): string {
  const secret = process.env.REGISTRY_CLAIM_KEY;
  if (!secret) return encoded;

  try {
    const [ivB64, encB64] = encoded.split(":");
    const key       = getKey(secret);
    const iv        = Buffer.from(ivB64, "base64");
    const encrypted = Buffer.from(encB64, "base64");
    const decipher  = createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "[unable to decrypt]";
  }
}
