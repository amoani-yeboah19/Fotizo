import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts personal identifiers kept on accounts (national ID numbers, payout
// wallet and bank account numbers) with AES-256-GCM, which also detects any
// tampering. The key is PERSONAL_DATA_KEY: 32 random bytes, base64.
const key = () => {
  const raw = process.env.PERSONAL_DATA_KEY?.trim();
  if (!raw) return null;
  const bytes = Buffer.from(raw, "base64");
  return bytes.length === 32 ? bytes : null;
};

export const secretBoxReady = () => key() !== null;

export class SecretBoxError extends Error {}

/** "v1.<iv>.<tag>.<ciphertext>", each base64url. */
export function seal(plain: string): string {
  const k = key();
  if (!k) throw new SecretBoxError("PERSONAL_DATA_KEY is not set (32 random bytes, base64).");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function open(sealed: string): string {
  const k = key();
  if (!k) throw new SecretBoxError("PERSONAL_DATA_KEY is not set (32 random bytes, base64).");
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new SecretBoxError("Unreadable sealed value.");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** The last `n` characters, for showing which number is saved ("••••7890"). */
export const hint = (value: string, n = 4) => value.slice(-n);
