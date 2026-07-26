export type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode: string;
};

export type InvoiceDraft = {
  customerName: string;
  customerGstin: string;
  currency: string;
  invoiceNumber: string;
  dueDate: string;
  lines: InvoiceLine[];
};

export type InvoiceSummary = {
  subtotal: number;
  taxTotal: number;
  total: number;
  isValid: boolean;
  warnings: string[];
};

export function calculateInvoiceSummary(draft: InvoiceDraft): InvoiceSummary {
  const warnings: string[] = [];

  if (!draft.customerName.trim()) {
    warnings.push("Customer name is required");
  }

  if (!draft.invoiceNumber.trim()) {
    warnings.push("Invoice number is required");
  }

  if (!draft.lines.length) {
    warnings.push("At least one line item is required");
  }

  const subtotal = draft.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxTotal = draft.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate) / 100, 0);
  const total = subtotal + taxTotal;

  const isValid = warnings.length === 0;

  return { subtotal, taxTotal, total, isValid, warnings };
}

export function sanitizeInvoiceDraft(draft: InvoiceDraft): InvoiceDraft {
  return {
    ...draft,
    customerName: draft.customerName.trim(),
    customerGstin: draft.customerGstin.trim().toUpperCase(),
    invoiceNumber: draft.invoiceNumber.trim(),
    currency: (draft.currency ?? "").trim().toUpperCase() || "INR",
    lines: draft.lines.map((line) => ({
      ...line,
      description: line.description.trim(),
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      taxRate: Number(line.taxRate) || 0,
    })),
  };
}
