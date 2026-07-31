import { describe, expect, it } from "vitest";
import { calculateInvoiceSummary, sanitizeInvoiceDraft } from "./invoicing";

describe("invoice calculations", () => {
  it("calculates subtotal, tax total, and total correctly", () => {
    const draft = {
      customerName: "Northstar Retail",
      customerGstin: "27AABCU9603R1ZX",
      currency: "inr",
      invoiceNumber: "INV-1001",
      dueDate: "2026-07-20",
      lines: [
        { id: "1", description: "Consulting", quantity: 1, unitPrice: 24000, taxRate: 18, hsnCode: "" },
      ],
    };

    const summary = calculateInvoiceSummary(draft);

    expect(summary.subtotal).toBe(24000);
    expect(summary.taxTotal).toBe(4320);
    expect(summary.total).toBe(28320);
    expect(summary.isValid).toBe(true);
    expect(summary.warnings).toEqual([]);
  });

  it("sanitizes and normalizes draft values", () => {
    const draft = {
      customerName: "  Northstar  ",
      customerGstin: " 27aabc", 
      currency: "  ",
      invoiceNumber: "  INV-1002  ",
      dueDate: "2026-07-20",
      lines: [
        { id: "1", description: "  Service  ", quantity: "2" as unknown as number, unitPrice: "1200" as unknown as number, taxRate: "5" as unknown as number, hsnCode: "" },
      ],
    };

    const sanitized = sanitizeInvoiceDraft(draft as never);

    expect(sanitized.customerName).toBe("Northstar");
    expect(sanitized.customerGstin).toBe("27AABC");
    expect(sanitized.currency).toBe("INR");
    expect(sanitized.invoiceNumber).toBe("INV-1002");
    expect(sanitized.lines[0].quantity).toBe(2);
    expect(sanitized.lines[0].unitPrice).toBe(1200);
    expect(sanitized.lines[0].taxRate).toBe(5);
  });
});
