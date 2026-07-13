import type { AnomalyFlag } from "./types";
import type { InvoiceDraft } from "../invoicing";

/**
 * Rule-based anomaly detection for invoices.
 *
 * Flags unusual patterns — high-value items, rounding issues,
 * unrealistic tax rates, duplicate-looking descriptions, etc.
 */

const SUSPICIOUS_TAX_RATES = [0, 0.1, 1, 3, 7, 28];
const MAX_REASONABLE_UNIT_PRICE = 10_000_000;
const MAX_REASONABLE_QUANTITY = 10_000;
const DUPLICATE_DESCRIPTION_SIMILARITY = 0.85;

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

export function detectAnomalies(draft: InvoiceDraft): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // Check for suspicious tax rates
  for (const line of draft.lines) {
    if (SUSPICIOUS_TAX_RATES.includes(line.taxRate) && line.taxRate !== 0 && line.taxRate !== 18) {
      flags.push({
        severity: "warning",
        field: `line-${line.id}.taxRate`,
        message: `Unusual tax rate: ${line.taxRate}%`,
        suggestion: `Common GST rates are 0%, 5%, 12%, 18%, 28%. Verify ${line.taxRate}% is correct.`,
      });
    }

    if (line.unitPrice > MAX_REASONABLE_UNIT_PRICE) {
      flags.push({
        severity: "warning",
        field: `line-${line.id}.unitPrice`,
        message: `High unit price: ₹${line.unitPrice.toLocaleString()}`,
        suggestion: "Verify this pricing with the customer before sending.",
      });
    }

    if (line.quantity > MAX_REASONABLE_QUANTITY) {
      flags.push({
        severity: "info",
        field: `line-${line.id}.quantity`,
        message: `Large quantity: ${line.quantity}`,
        suggestion: "Confirm that the quantity is accurate.",
      });
    }
  }

  // Check for duplicate line items
  for (let i = 0; i < draft.lines.length; i++) {
    for (let j = i + 1; j < draft.lines.length; j++) {
      if (!draft.lines[i].description || !draft.lines[j].description) continue;
      const sim = similarity(draft.lines[i].description, draft.lines[j].description);
      if (sim > DUPLICATE_DESCRIPTION_SIMILARITY) {
        flags.push({
          severity: "info",
          field: `line-${draft.lines[j].id}.description`,
          message: `Line item "${draft.lines[j].description}" looks similar to another item`,
          suggestion: "Consider merging duplicate line items or clarifying descriptions.",
        });
      }
    }
  }

  // Check for zero tax on taxable-looking items
  for (const line of draft.lines) {
    if (line.taxRate === 0 && line.unitPrice > 0) {
      const hasProfessional = /consult|service|professional|software/i.test(line.description);
      if (hasProfessional) {
        flags.push({
          severity: "info",
          field: `line-${line.id}.taxRate`,
          message: `Zero tax on "${line.description}"`,
          suggestion: "Professional services typically attract 18% GST. Verify the tax exemption.",
        });
      }
    }
  }

  // Check GSTIN format for Indian invoices
  if (draft.customerGstin && draft.currency === "INR") {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (draft.customerGstin.length > 0 && !gstinRegex.test(draft.customerGstin)) {
      flags.push({
        severity: "warning",
        field: "customerGstin",
        message: "GSTIN format looks invalid",
        suggestion: "A valid GSTIN has 15 characters: 2 state digits + 10 PAN + 1 entity code + Z + check digit.",
      });
    }
  }

  return flags;
}
