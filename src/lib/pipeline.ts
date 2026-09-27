import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | typeof prisma;

/**
 * Ensures a Party record exists for the given name in the organization.
 * Recalculates and updates the party's outstanding balance across all
 * invoices, payments, credit notes, and debit notes.
 */
export async function syncPartyAndBalance(
  tx: TxClient,
  orgId: string,
  partyName: string,
  options?: {
    type?: "customer" | "vendor" | "other";
    gstin?: string;
    email?: string;
    phone?: string;
    address?: string;
  },
): Promise<string | null> {
  if (!partyName || !partyName.trim()) return null;

  const trimmedName = partyName.trim();
  const partyType = options?.type ?? "customer";

  // Find or create Party
  let party = await tx.party.findFirst({
    where: {
      orgId,
      name: { equals: trimmedName, mode: "insensitive" },
    },
  });

  if (!party) {
    party = await tx.party.create({
      data: {
        orgId,
        name: trimmedName,
        type: partyType,
        gstin: options?.gstin ?? "",
        email: options?.email ?? "",
        phone: options?.phone ?? "",
        outstandingBalance: 0,
      },
    });

    if (options?.address) {
      await tx.partyAddress.create({
        data: {
          partyId: party.id,
          type: "billing",
          address: options.address,
        },
      });
    }
  } else {
    // Update contact info if provided
    const updateData: Record<string, string> = {};
    if (options?.gstin && !party.gstin) updateData.gstin = options.gstin;
    if (options?.email && !party.email) updateData.email = options.email;
    if (options?.phone && !party.phone) updateData.phone = options.phone;
    if (Object.keys(updateData).length > 0) {
      await tx.party.update({
        where: { id: party.id },
        data: updateData,
      });
    }
  }

  // Recalculate outstanding balance for this party
  // Outstanding = Sum(Invoices Total) - Sum(Completed Payments) - Sum(Credit Notes) + Sum(Debit Notes)
  const invoices = await tx.invoice.findMany({
    where: {
      orgId,
      customerName: { equals: party.name, mode: "insensitive" },
      status: { notIn: ["draft", "cancelled"] },
    },
    select: { id: true, total: true, amountPaid: true },
  });

  const invoiceIds = invoices.map((i) => i.id);

  // Payments linked to party's invoices or payments with party name in notes
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);

  const completedPayments = await tx.payment.aggregate({
    where: {
      orgId,
      status: "completed",
      invoiceId: { in: invoiceIds },
    },
    _sum: { amount: true },
  });
  const totalPaid = completedPayments._sum.amount ?? 0;

  const creditNotes = await tx.creditNote.aggregate({
    where: {
      orgId,
      customerName: { equals: party.name, mode: "insensitive" },
      status: { notIn: ["draft", "cancelled"] },
    },
    _sum: { total: true },
  });
  const totalCreditNotes = creditNotes._sum.total ?? 0;

  const debitNotes = await tx.debitNote.aggregate({
    where: {
      orgId,
      supplierName: { equals: party.name, mode: "insensitive" },
      status: { notIn: ["draft", "cancelled"] },
    },
    _sum: { total: true },
  });
  const totalDebitNotes = debitNotes._sum.total ?? 0;

  let outstanding = totalInvoiced - totalPaid - totalCreditNotes + totalDebitNotes;
  outstanding = Math.round(outstanding * 100) / 100;

  await tx.party.update({
    where: { id: party.id },
    data: { outstandingBalance: Math.max(0, outstanding) },
  });

  return party.id;
}

/**
 * Gets or creates default Warehouse for organization
 */
export async function getOrCreateDefaultWarehouse(
  tx: TxClient,
  orgId: string,
): Promise<string> {
  let warehouse = await tx.warehouse.findFirst({
    where: { orgId, isActive: true },
    select: { id: true },
  });

  if (!warehouse) {
    warehouse = await tx.warehouse.create({
      data: {
        orgId,
        name: "Main Warehouse",
        address: "Primary Storage",
      },
      select: { id: true },
    });
  }

  return warehouse.id;
}

export type LineStockInput = {
  description: string;
  quantity: number;
  hsnCode?: string;
  unitPrice?: number;
};

/**
 * Deducts or restores stock and logs StockMovement for invoice line items.
 * Direction: "out" for Sales Invoice, "in" for Sales Return / Purchase Invoice.
 */
export async function syncInvoiceInventory(
  tx: TxClient,
  orgId: string,
  documentNumber: string,
  lines: LineStockInput[],
  direction: "in" | "out",
): Promise<void> {
  if (!lines || lines.length === 0) return;

  const warehouseId = await getOrCreateDefaultWarehouse(tx, orgId);

  for (const line of lines) {
    if (!line.quantity || line.quantity <= 0) continue;

    const itemName = line.description.trim();
    if (!itemName) continue;

    // Try to find matching Product by name or SKU
    let product = await tx.product.findFirst({
      where: {
        orgId,
        isActive: true,
        OR: [
          { name: { equals: itemName, mode: "insensitive" } },
          { sku: { equals: itemName, mode: "insensitive" } },
        ],
      },
    });

    // If product doesn't exist, create product automatically
    if (!product) {
      product = await tx.product.create({
        data: {
          orgId,
          name: itemName,
          hsnCode: line.hsnCode ?? "",
          sellingPrice: line.unitPrice ?? 0,
          purchasePrice: line.unitPrice ?? 0,
          unit: "pcs",
        },
      });
    }

    // Update inventory item quantity
    const existingInventory = await tx.inventoryItem.findFirst({
      where: { orgId, productId: product.id, warehouseId },
    });

    const qtyChange = direction === "out" ? -line.quantity : line.quantity;

    if (existingInventory) {
      const newQty = Math.max(0, existingInventory.quantity + qtyChange);
      await tx.inventoryItem.update({
        where: { id: existingInventory.id },
        data: { quantity: newQty },
      });
    } else {
      const initialQty = direction === "out" ? 0 : line.quantity;
      await tx.inventoryItem.create({
        data: {
          orgId,
          productId: product.id,
          warehouseId,
          quantity: initialQty,
        },
      });
    }

    // Log StockMovement
    await tx.stockMovement.create({
      data: {
        orgId,
        productId: product.id,
        warehouseId,
        type: direction,
        quantity: Math.abs(line.quantity),
        reference: documentNumber,
        notes: `Auto-recorded from document ${documentNumber}`,
      },
    });
  }
}

/**
 * Re-computes invoice amountPaid and status based on all completed Payments.
 */
export async function syncPaymentToInvoice(
  tx: TxClient,
  orgId: string,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findFirst({
    where: { id: invoiceId, orgId },
    select: { id: true, total: true, status: true, customerName: true },
  });

  if (!invoice) return;

  const payments = await tx.payment.aggregate({
    where: {
      invoiceId: invoice.id,
      status: "completed",
    },
    _sum: { amount: true },
  });

  const totalPaid = Math.round((payments._sum.amount ?? 0) * 100) / 100;

  let newStatus = invoice.status;
  if (totalPaid >= invoice.total && invoice.total > 0) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partially_paid";
  } else if (invoice.status === "paid" || invoice.status === "partially_paid") {
    newStatus = "sent";
  }

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: totalPaid,
      status: newStatus,
    },
  });

  // Re-sync Party Balance
  await syncPartyAndBalance(tx, orgId, invoice.customerName);
}
