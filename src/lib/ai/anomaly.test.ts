import { describe, expect, it } from "vitest";
import { detectAnomalies } from "./anomaly";
import type { InvoiceDraft } from "../invoicing";

const validDraft: InvoiceDraft = {
  customerName: "Northstar Retail",
  customerGstin: "27AABCU9603R1ZX",
  currency: "INR",
  invoiceNumber: "INV-1001",
  dueDate: "2026-07-20",
  lines: [{ id: "1", description: "Consulting", quantity: 1, unitPrice: 24000, taxRate: 18, discount: 0, hsnCode: "" }],
};

describe("anomaly detection", () => {
  it("passes a clean invoice", () => {
    expect(detectAnomalies(validDraft)).toHaveLength(0);
  });

  it("flags suspicious tax rates", () => {
    const draft = { ...validDraft, lines: [{ ...validDraft.lines[0], taxRate: 3 }] };
    const flags = detectAnomalies(draft);
    expect(flags.some((f) => f.message.includes("tax rate"))).toBe(true);
  });

  it("flags high unit prices", () => {
    const draft = { ...validDraft, lines: [{ ...validDraft.lines[0], unitPrice: 99_999_999 }] };
    const flags = detectAnomalies(draft);
    expect(flags.some((f) => f.message.includes("High unit price"))).toBe(true);
  });

  it("flags invalid GSTIN format", () => {
    const draft = { ...validDraft, customerGstin: "invalid" };
    const flags = detectAnomalies(draft);
    expect(flags.some((f) => f.field === "customerGstin")).toBe(true);
  });

  it("flags zero tax on professional services", () => {
    const draft = {
      ...validDraft,
      lines: [{ id: "1", description: "Professional consulting", quantity: 1, unitPrice: 10000, taxRate: 0, discount: 0, hsnCode: "" }],
    };
    const flags = detectAnomalies(draft);
    expect(flags.some((f) => f.message.includes("Zero tax"))).toBe(true);
  });
});
