/**
 * CRM→BizzBills Token Bridge
 *
 * The CRM (bizzauto-automation) signs a short-lived one-time token:
 *   payload = { email, name, businessName, crmUserId, jti, iat, exp }
 *   token   = base64url(json) + '.' + base64url(HMAC-SHA256(json, BRIDGE_SECRET))
 *
 * This module verifies it. Both apps must share BRIDGE_SECRET.
 * Replay protection: jti is single-use (in-memory; swap for DB/Redis if you
 * ever run multiple BizzBills instances behind a LB).
 */
import crypto from "crypto";

const BRIDGE_SECRET = process.env.BRIDGE_SECRET;
const MAX_AGE_SECONDS = 60;

export interface BridgePayload {
  email: string;
  name?: string;
  businessName?: string;
  crmUserId?: string;
  jti: string;
  iat: number;
  exp: number;
}

// jti single-use registry (lazily pruned)
const usedJtis = new Map<string, number>();
function pruneUsed(): void {
  const now = Date.now();
  for (const [jti, expiry] of usedJtis) {
    if (expiry < now) usedJtis.delete(jti);
  }
}

export function isBridgeConfigured(): boolean {
  return !!BRIDGE_SECRET;
}

/** Timing-safe HMAC verification of the bridge token. Returns payload or null. */
export function verifyBridgeToken(token: string): BridgePayload | null {
  if (!BRIDGE_SECRET || !token) return null;
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expected = crypto
      .createHmac("sha256", BRIDGE_SECRET)
      .update(encoded)
      .digest("base64url");

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as BridgePayload;

    if (!payload.email || !payload.jti || !payload.exp) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now())
      return null;

    // Replay protection
    pruneUsed();
    if (usedJtis.has(payload.jti)) return null;
    usedJtis.set(payload.jti, payload.exp * 1000 + 30_000);

    return payload;
  } catch {
    return null;
  }
}

/** Generate the slug the same way the register flow does (org auto-create) */
export function slugifyForOrg(seed: string): string {
  return (
    seed
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 40) +
    "-" +
    Date.now().toString(36)
  );
}

export { MAX_AGE_SECONDS };
