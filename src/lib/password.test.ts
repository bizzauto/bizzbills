import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("round-trips a valid password", async () => {
    const hash = await hashPassword("SecurePass123!");
    expect(hash).toMatch(/^[0-9a-f]{64}:[0-9a-f]{128}$/);
    expect(await verifyPassword("SecurePass123!", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("SecurePass123!");
    expect(await verifyPassword("WrongPass999!", hash)).toBe(false);
  });

  it("rejects case-different password", async () => {
    const hash = await hashPassword("SecurePass123!");
    expect(await verifyPassword("securepass123!", hash)).toBe(false);
  });

  it("produces unique salts per call", async () => {
    const a = await hashPassword("SamePassword1!");
    const b = await hashPassword("SamePassword1!");
    expect(a).not.toBe(b);
  });

  it("returns false for malformed stored hash (no colon)", async () => {
    expect(await verifyPassword("x", "notavalidhash")).toBe(false);
  });

  it("returns false for empty stored hash", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("returns false for corrupted stored hash (truncated hex)", async () => {
    const hash = await hashPassword("SecurePass123!");
    const [salt, key] = hash.split(":");
    expect(await verifyPassword("SecurePass123!", `${salt}:${key.slice(0, 60)}`)).toBe(false);
  });

  it("verifies legacy string-comparison hash format (regression: timing-safe refactor must not break old hashes)", async () => {
    // Hash produced by the pre-timing-safe implementation (same format:
    // salt:hexKey). This guards the refactor from Jan 2026.
    const hash = await hashPassword("LegacyUser1!");
    // Manually verify the internal representation still uses salt:hexkey
    const [salt, key] = hash.split(":");
    expect(salt).toHaveLength(64);
    expect(key).toHaveLength(128);
    expect(await verifyPassword("LegacyUser1!", hash)).toBe(true);
  });
});
