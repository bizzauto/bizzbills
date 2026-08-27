import { describe, it, expect } from "vitest";
import { toMinor, toMajor, sumExact, taxOn, MINOR_PER_MAJOR } from "./money";

describe("money: exact arithmetic", () => {
  it("converts major <-> minor without drift", () => {
    expect(toMinor(123.45)).toBe(12345);
    expect(toMajor(12345)).toBe(123.45);
    expect(MINOR_PER_MAJOR).toBe(100);
  });

  it("sums amounts exactly (no binary float drift)", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in float; must be 0.3 here.
    expect(sumExact([0.1, 0.2])).toBe(0.3);
    expect(sumExact([19.99, 0.01, 100])).toBe(120.0);
  });

  it("computes tax exactly at common GST rates", () => {
    expect(taxOn(100, 18)).toBe(18);
    expect(taxOn(1000, 5)).toBe(50);
    expect(taxOn(299.99, 18)).toBeCloseTo(54, 2); // 53.9982 -> 54.00
  });

  it("clamps negative/over-100 tax rates to 0..100%", () => {
    expect(taxOn(100, -5)).toBe(0);
    expect(taxOn(100, 250)).toBe(100); // clamped to 100%
  });

  it("multi-line invoice total matches expected minor-unit math", () => {
    // lines: 2 x 100 @18%, 1 x 50 @5%
    const subtotal = sumExact([200, 50]); // 250
    const tax = sumExact([taxOn(200, 18), taxOn(50, 5)]); // 36 + 2.5 = 38.5
    const total = sumExact([subtotal, tax]); // 288.5
    expect(subtotal).toBe(250);
    expect(tax).toBe(38.5);
    expect(total).toBe(288.5);
  });
});
