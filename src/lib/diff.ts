/**
 * Invoice diff engine.
 *
 * Compares two invoice snapshots and produces a structured list of changes.
 * Each change records the field path, previous value, new value, and type.
 */

export type DiffChange = {
  path: string;
  type: "added" | "removed" | "changed";
  label: string;
  from?: unknown;
  to?: unknown;
};

export type InvoiceSnapshot = {
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  currency: string;
  dueDate: string;
  status: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
};

function fieldLabel(path: string): string {
  const labels: Record<string, string> = {
    invoiceNumber: "Invoice number",
    customerName: "Customer name",
    customerGstin: "GSTIN",
    currency: "Currency",
    dueDate: "Due date",
    status: "Status",
  };
  return labels[path] ?? path;
}

export function diffSnapshots(
  before: InvoiceSnapshot | null,
  after: InvoiceSnapshot,
): DiffChange[] {
  const changes: DiffChange[] = [];

  if (!before) {
    changes.push({
      path: "invoice",
      type: "added",
      label: "Invoice created",
      to: after.invoiceNumber,
    });
    return changes;
  }

  // Compare scalar fields
  const scalarFields: Array<keyof InvoiceSnapshot> = [
    "invoiceNumber",
    "customerName",
    "customerGstin",
    "currency",
    "dueDate",
    "status",
  ];

  for (const field of scalarFields) {
    if (before[field] !== after[field]) {
      changes.push({
        path: field,
        type: "changed",
        label: fieldLabel(field),
        from: before[field],
        to: after[field],
      });
    }
  }

  // Compare line items
  const maxLines = Math.max(before.lines.length, after.lines.length);
  for (let i = 0; i < maxLines; i++) {
    const beforeLine = before.lines[i];
    const afterLine = after.lines[i];
    const lineLabel = `Line ${i + 1}`;

    if (!beforeLine && afterLine) {
      changes.push({
        path: `lines[${i}]`,
        type: "added",
        label: `${lineLabel}: ${afterLine.description || "(empty)"}`,
        to: afterLine,
      });
      continue;
    }

    if (beforeLine && !afterLine) {
      changes.push({
        path: `lines[${i}]`,
        type: "removed",
        label: `${lineLabel}: ${beforeLine.description || "(empty)"}`,
        from: beforeLine,
      });
      continue;
    }

    const lineFields: Array<keyof typeof beforeLine> = [
      "description",
      "quantity",
      "unitPrice",
      "taxRate",
    ];
    for (const f of lineFields) {
      if (beforeLine![f] !== afterLine![f]) {
        changes.push({
          path: `lines[${i}].${f}`,
          type: "changed",
          label: `${lineLabel} ${f}`,
          from: beforeLine![f],
          to: afterLine![f],
        });
      }
    }
  }

  return changes;
}

export function snapshotFromInvoice(invoice: {
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  currency: string;
  dueDate: string;
  status: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}): InvoiceSnapshot {
  return {
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    customerGstin: invoice.customerGstin,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
    })),
  };
}
