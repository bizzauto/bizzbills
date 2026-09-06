import crypto from "node:crypto";

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const HASH_ALGO = "sha512";
const ITERATIONS = 210000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGO, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGO, (err, derivedKey) => {
      if (err) reject(err);
      else {
        // Constant-time comparison of the raw derived key against the
        // stored hex-decoded hash (both 64 raw bytes) — prevents timing
        // attacks. Plain string === would leak via early-exit comparison.
        const expected = Buffer.from(key, "hex");
        resolve(
          derivedKey.length === expected.length &&
            crypto.timingSafeEqual(derivedKey, expected),
        );
      }
    });
  });
}
