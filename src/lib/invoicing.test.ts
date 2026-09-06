import { describe, expect, it } from "vitest";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft } from "./invoicing";

function draft(overrides: Partial<InvoiceDraft> = {}): InvoiceDraft {
  return {
    customerName: "Northstar Retail",
    customerGstin: "27AABCU9603R1ZX",
    currency: "INR",
    invoiceNumber: "INV-1001",
    dueDate: "2026-07-20",
    lines: [{ id: "1", description: "Consulting", quantity: 1, unitPrice: 24000, taxRate: 18, discount: 0, hsnCode: "" }],
    ...overrides,
  };
}

describe("calculateInvoiceSummary", () => {
  it("calculates subtotal, tax, and total for a plain line", () => {
    const summary = calculateInvoiceSummary(draft());
    expect(summary.subtotal).toBe(24000);
    expect(summary.taxTotal).toBe(4320);
    expect(summary.total).toBe(28320);
    expect(summary.discountAmount).toBe(0);
    expect(summary.roundOff).toBe(0);
    expect(summary.isValid).toBe(true);
    expect(summary.warnings).toEqual([]);
  });

  it("applies per-line discount before tax", () => {
    const summary = calculateInvoiceSummary(
      draft({
        lines: [
          { id: "1", description: "Widgets", quantity: 2, unitPrice: 1000, taxRate: 18, discount: 5, hsnCode: "" },
        ],
      }),
    );
    expect(summary.subtotal).toBe(2000);
    expect(summary.discountAmount).toBe(100);
    expect(summary.taxTotal).toBe(342); // 1900 × 18%
    expect(summary.total).toBe(2242); // 2000 − 100 + 342
  });

  it("adds shipping and subtracts adjustment", () => {
    const summary = calculateInvoiceSummary(
      draft({
        shippingCharges: 50,
        adjustment: 20,
        lines: [{ id: "1", description: "Service", quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0, hsnCode: "" }],
      }),
    );
    expect(summary.total).toBe(1210); // 1000 + 180 + 50 − 20
  });

  it("tax-inclusive prices keep the after-discount total without adding tax", () => {
    const summary = calculateInvoiceSummary(
      draft({
        isTaxInclusive: true,
        lines: [{ id: "1", description: "Item", quantity: 1, unitPrice: 1180, taxRate: 18, discount: 0, hsnCode: "" }],
      }),
    );
    expect(summary.subtotal).toBe(1180);
    expect(summary.taxTotal).toBe(212.4);
    expect(summary.total).toBe(1180); // no tax added on top
  });

  it("rounds the payable total to the nearest rupee", () => {
    const summary = calculateInvoiceSummary(
      draft({
        lines: [{ id: "1", description: "Item", quantity: 3, unitPrice: 99.99, taxRate: 18, discount: 0, hsnCode: "" }],
      }),
    );
    // subtotal 299.97, tax 53.99, payable 353.96 → rounds to 354
    expect(summary.total).toBe(354);
    expect(summary.roundOff).toBeCloseTo(0.04, 5);
  });

  it("applies whole-invoice discountPercent on top of per-line discounts", () => {
    const summary = calculateInvoiceSummary(
      draft({
        discountPercent: 10,
        lines: [
          { id: "1", description: "Widgets", quantity: 2, unitPrice: 1000, taxRate: 18, discount: 5, hsnCode: "" },
        ],
      }),
    );
    // subtotal 2000, line disc 100 → 1900 taxable, tax 342 (18%)
    // invoice disc 10% of 1900 = 190 → afterDiscount 1710 → total 1710 + 342 = 2052
    expect(summary.subtotal).toBe(2000);
    expect(summary.discountAmount).toBe(290);
    expect(summary.taxTotal).toBe(342);
    expect(summary.total).toBe(2052);
  });

  it("flags missing customer, number, and empty line items", () => {
    const summary = calculateInvoiceSummary(draft({ customerName: "", invoiceNumber: "", lines: [] }));
    expect(summary.isValid).toBe(false);
    expect(summary.warnings).toContain("Customer name is required");
    expect(summary.warnings).toContain("Invoice number is required");
    expect(summary.warnings).toContain("At least one line item is required");
  });
});

describe("sanitizeInvoiceDraft", () => {
  it("normalizes customer, GSTIN, currency, and number", () => {
    const sanitized = sanitizeInvoiceDraft(draft({
      customerName: "  Northstar  ",
      customerGstin: " 27aabc",
      currency: "  ",
      invoiceNumber: "  INV-1002  ",
    }));
    expect(sanitized.customerName).toBe("Northstar");
    expect(sanitized.customerGstin).toBe("27AABC");
    expect(sanitized.currency).toBe("INR");
    expect(sanitized.invoiceNumber).toBe("INV-1002");
  });

  it("coerces line numbers and keeps the discount", () => {
    const sanitized = sanitizeInvoiceDraft(
      draft({
        lines: [{
          id: "1", description: "  Service  ",
          quantity: "2" as unknown as number,
          unitPrice: "1200" as unknown as number,
          taxRate: "5" as unknown as number,
          discount: "10" as unknown as number,
          hsnCode: "",
        }],
      }),
    );
    expect(sanitized.lines[0].quantity).toBe(2);
    expect(sanitized.lines[0].unitPrice).toBe(1200);
    expect(sanitized.lines[0].taxRate).toBe(5);
    expect(sanitized.lines[0].discount).toBe(10);
  });

  it("keeps an explicit status and defaults to draft otherwise", () => {
    expect(sanitizeInvoiceDraft(draft({ status: "pending" })).status).toBe("pending");
    expect(sanitizeInvoiceDraft(draft()).status).toBe("draft");
    expect(sanitizeInvoiceDraft(draft({ status: "paid" })).status).toBe("draft");
  });
});
