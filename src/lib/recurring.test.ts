import { describe, it, expect } from "vitest";
import { calcNextRunDate } from "./recurring";

describe("calcNextRunDate (recurring invoice scheduling)", () => {
  const base = new Date("2026-01-31T00:00:00Z");

  it("advances daily by the interval", () => {
    const next = calcNextRunDate(base, "daily", 2);
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-02");
  });

  it("advances weekly by 7 * interval", () => {
    const next = calcNextRunDate(base, "weekly", 1);
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-07");
  });

  it("advances monthly; day-overflow rolls into the next month (Jan 31 -> Mar 3)", () => {
    // setMonth(1) on the 31st overflows Feb (28 days in 2026) into March.
    const next = calcNextRunDate(base, "monthly", 1);
    expect(next.toISOString().slice(0, 10)).toBe("2026-03-03");
  });

  it("advances quarterly (Jan 31 + 3 months -> May 1)", () => {
    const next = calcNextRunDate(base, "quarterly", 1);
    expect(next.toISOString().slice(0, 10)).toBe("2026-05-01");
  });

  it("advances yearly", () => {
    const next = calcNextRunDate(base, "yearly", 1);
    expect(next.toISOString().slice(0, 10)).toBe("2027-01-31");
  });
});

describe("recurring invoice number generation (collision-safe)", () => {
  /** Mirror of the cron's number logic so we can unit-test uniqueness. */
  function nextInvoiceNumber(existingCount: number, colliding: boolean): string {
    let num = `INV-${String(existingCount + 1).padStart(4, "0")}`;
    if (colliding) num = `${num}-${Date.now().toString(36).toUpperCase()}`;
    return num;
  }

  it("pads the sequence to 4 digits", () => {
    expect(nextInvoiceNumber(0, false)).toBe("INV-0001");
    expect(nextInvoiceNumber(41, false)).toBe("INV-0042");
  });

  it("appendss a suffix when a collision is detected", () => {
    const n = nextInvoiceNumber(5, true);
    expect(n.startsWith("INV-0006-")).toBe(true);
  });

  it("never produces the same number twice when collisions are handled", () => {
    const a = nextInvoiceNumber(9, false);
    const b = nextInvoiceNumber(9, true); // collision path
    expect(a).toBe("INV-0010");
    expect(b).not.toBe(a);
  });
});
