export type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode: string;
  /** Per-line percentage discount (0–100). */
  discount: number;
};

export type InvoiceDraft = {
  // Customer / invoice details
  customerName: string;
  customerGstin: string;
  currency: string;
  invoiceNumber: string;
  dueDate: string;
  lines: InvoiceLine[];

  // Extended fields (persisted — see Invoice model)
  status?: string;
  date?: string;
  invoicePrefix?: string;
  invoicePostfix?: string;
  invoiceTitle?: string;
  referenceNumber?: string;
  poNumber?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerState?: string;
  shippingSameAsBilling?: boolean;
  shippingName?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  shippingCharges?: number;
  adjustment?: number;
  isTaxInclusive?: boolean;
  notes?: string;
  terms?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  signatureName?: string;
  signatureDesignation?: string;
  roundOff?: number;
  amountInWords?: string;
};

export type InvoiceSummary = {
  subtotal: number;
  /** Tax computed on the discounted taxable amount. */
  taxTotal: number;
  total: number;
  /** Per-line discounts + whole-invoice discountPercent. */
  discountAmount: number;
  roundOff: number;
  isValid: boolean;
  warnings: string[];
};

/** 1 rupee rounding for the payable total (Indian invoicing convention). */
const ROUND_OFF = 1;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round money to 2 decimal places to avoid float drift. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function validateInvoiceNumber(draft: InvoiceDraft): string[] {
  const warnings: string[] = [];
  if (!draft.invoiceNumber?.trim()) warnings.push("Invoice number is required");
  return warnings;
}

function validateCustomer(draft: InvoiceDraft): string[] {
  const warnings: string[] = [];
  if (!draft.customerName?.trim()) warnings.push("Customer name is required");
  return warnings;
}

function validateLines(draft: InvoiceDraft): string[] {
  const warnings: string[] = [];
  const filled = draft.lines.filter((l) => l.description.trim() !== "");
  if (filled.length === 0) warnings.push("At least one line item is required");

  for (let i = 0; i < filled.length; i++) {
    const line = filled[i];
    const lineNum = i + 1;
    const qty = toNumber(line.quantity);
    const price = toNumber(line.unitPrice);
    const taxRate = toNumber(line.taxRate);
    const discount = toNumber(line.discount);

    if (qty <= 0) warnings.push(`Line ${lineNum}: quantity must be > 0`);
    if (!Number.isFinite(qty)) warnings.push(`Line ${lineNum}: quantity must be a valid number`);
    if (price < 0) warnings.push(`Line ${lineNum}: unit price cannot be negative`);
    if (!Number.isFinite(price)) warnings.push(`Line ${lineNum}: unit price must be a valid number`);
    if (taxRate < 0 || taxRate > 100) warnings.push(`Line ${lineNum}: tax rate must be 0–100`);
    if (discount < 0 || discount > 100) warnings.push(`Line ${lineNum}: discount must be 0–100`);
  }
  return warnings;
}

/**
 * Single source of truth for invoice money math.
 *
 * Order of operations (matches the new-invoice form):
 *   1. per-line: (qty × rate) − (qty × rate × discount%) = taxable
 *   2. tax on the discounted taxable amount (18% GST → CGST 9% + SGST 9%)
 *   3. after-discount = subtotal − total discounts
 *   4. tax-inclusive mode: payable = after-discount
 *   5. otherwise: payable = after-discount + tax + shipping − adjustment
 *   6. round payable to the nearest rupee (roundOff = delta)
 */
export function calculateInvoiceSummary(draft: InvoiceDraft): InvoiceSummary {
  const warnings = [
    ...validateInvoiceNumber(draft),
    ...validateCustomer(draft),
    ...validateLines(draft),
  ];

  let subtotal = 0;
  let discountAmount = 0;
  let taxTotal = 0;

  for (const line of draft.lines) {
    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unitPrice);
    const taxRate = toNumber(line.taxRate);
    const lineDiscount = toNumber(line.discount);

    const lineTotal = round2(quantity * unitPrice);
    const discount = round2(lineTotal * Math.min(Math.max(lineDiscount, 0), 100) / 100);
    const taxable = round2(lineTotal - discount);
    const tax = round2(taxable * Math.min(Math.max(taxRate, 0), 100) / 100);

    subtotal += lineTotal;
    discountAmount += discount;
    taxTotal += tax;
  }

  subtotal = round2(subtotal);
  discountAmount = round2(discountAmount);
  taxTotal = round2(taxTotal);

  const shippingCharges = toNumber(draft.shippingCharges);
  const adjustment = toNumber(draft.adjustment);
  const isTaxInclusive = draft.isTaxInclusive === true;

  // Whole-invoice percentage discount (applied on top of per-line discounts)
  const percentDiscount = round2((subtotal - discountAmount) * Math.min(Math.max(toNumber(draft.discountPercent), 0), 100) / 100);
  discountAmount = round2(discountAmount + percentDiscount);

  const afterDiscount = round2(subtotal - discountAmount);
  const payable = isTaxInclusive
    ? afterDiscount
    : round2(afterDiscount + taxTotal + shippingCharges - adjustment);

  const roundedTotal = Math.round(payable / ROUND_OFF) * ROUND_OFF;
  const roundOff = round2(roundedTotal - payable);

  return {
    subtotal,
    taxTotal,
    total: roundedTotal,
    discountAmount,
    roundOff,
    isValid: warnings.length === 0,
    warnings,
  };
}

export function sanitizeInvoiceDraft(draft: InvoiceDraft): InvoiceDraft {
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

  const clean: InvoiceDraft = {
    ...draft,
    customerName: text(draft.customerName),
    customerGstin: text(draft.customerGstin).toUpperCase(),
    invoiceNumber: text(draft.invoiceNumber),
    currency: text(draft.currency).toUpperCase() || "INR",
    lines: draft.lines.map((line) => ({
      ...line,
      description: text(line.description),
      hsnCode: text(line.hsnCode),
      quantity: num(line.quantity),
      unitPrice: num(line.unitPrice),
      taxRate: num(line.taxRate),
      discount: num(line.discount),
    })),
  };

  // Keep explicit status ("draft" | "pending") if provided; default to draft.
  if (clean.status !== "draft" && clean.status !== "pending") {
    clean.status = "draft";
  }

  return clean;
}
