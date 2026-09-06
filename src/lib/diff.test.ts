import { describe, expect, it } from "vitest";
import { diffSnapshots, snapshotFromInvoice, type InvoiceSnapshot } from "./diff";

const baseSnapshot: InvoiceSnapshot = {
  invoiceNumber: "INV-1001",
  customerName: "Northstar Retail",
  customerGstin: "27AABCU9603R1ZX",
  currency: "INR",
  dueDate: "2026-07-20",
  status: "draft",
  lines: [{ description: "Consulting", quantity: 1, unitPrice: 24000, taxRate: 18, discount: 0 }],
};

describe("diff engine", () => {
  it("returns added for first version (null before)", () => {
    const changes = diffSnapshots(null, baseSnapshot);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe("added");
    expect(changes[0].to).toBe("INV-1001");
  });

  it("detects a changed scalar field", () => {
    const after = { ...baseSnapshot, customerName: "New Corp" };
    const changes = diffSnapshots(baseSnapshot, after);
    expect(changes.some((c) => c.path === "customerName")).toBe(true);
    expect(changes.find((c) => c.path === "customerName")?.from).toBe("Northstar Retail");
    expect(changes.find((c) => c.path === "customerName")?.to).toBe("New Corp");
  });

  it("detects an added line item", () => {
    const after = {
      ...baseSnapshot,
      lines: [
        ...baseSnapshot.lines,
        { description: "Software license", quantity: 2, unitPrice: 5000, taxRate: 18, discount: 0 },
      ],
    };
    const changes = diffSnapshots(baseSnapshot, after);
    expect(changes.some((c) => c.path === "lines[1]" && c.type === "added")).toBe(true);
  });

  it("detects a removed line item", () => {
    const before = {
      ...baseSnapshot,
      lines: [
        { description: "Item A", quantity: 1, unitPrice: 100, taxRate: 18, discount: 0 },
        { description: "Item B", quantity: 2, unitPrice: 200, taxRate: 5, discount: 0 },
      ],
    };
    const after = { ...baseSnapshot, lines: before.lines.slice(0, 1) };
    const changes = diffSnapshots(before, after);
    expect(changes.some((c) => c.path === "lines[1]" && c.type === "removed")).toBe(true);
  });

  it("detects a changed line field", () => {
    const after = {
      ...baseSnapshot,
      lines: [{ ...baseSnapshot.lines[0], unitPrice: 30000 }],
    };
    const changes = diffSnapshots(baseSnapshot, after);
    expect(changes.some((c) => c.path === "lines[0].unitPrice")).toBe(true);
    expect(changes.find((c) => c.path === "lines[0].unitPrice")?.from).toBe(24000);
    expect(changes.find((c) => c.path === "lines[0].unitPrice")?.to).toBe(30000);
  });

  it("returns no changes for identical snapshots", () => {
    const changes = diffSnapshots(baseSnapshot, { ...baseSnapshot });
    expect(changes).toHaveLength(0);
  });

  it("detects multiple changes at once", () => {
    const after: InvoiceSnapshot = {
      ...baseSnapshot,
      customerName: "Updated Corp",
      dueDate: "2026-08-01",
      lines: [
        { description: "Consulting", quantity: 2, unitPrice: 24000, taxRate: 18, discount: 0 },
      ],
    };
    const changes = diffSnapshots(baseSnapshot, after);
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes.some((c) => c.path === "customerName")).toBe(true);
    expect(changes.some((c) => c.path === "dueDate")).toBe(true);
  });
});

describe("snapshotFromInvoice", () => {
  it("extracts a snapshot from an invoice record", () => {
    const invoice = {
      invoiceNumber: "INV-001",
      customerName: "Test",
      customerGstin: "27AAAAA0000A1Z5",
      currency: "INR",
      dueDate: "2026-07-25",
      status: "draft",
      lines: [{ description: "Service", quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }],
    };
    const snap = snapshotFromInvoice(invoice);
    expect(snap.invoiceNumber).toBe("INV-001");
    expect(snap.lines).toHaveLength(1);
    expect(snap.lines[0].description).toBe("Service");
  });
});
