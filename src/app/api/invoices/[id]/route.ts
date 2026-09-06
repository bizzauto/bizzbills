import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft } from "@/lib/invoicing";
import { snapshotFromInvoice, diffSnapshots } from "@/lib/diff";

async function getAuthInvoice(id: string, userId: string) {
  const orgId = await getSessionOrgId(userId);

  const where: { id: string; userId?: string; orgId?: string } = { id };
  if (orgId) {
    where.orgId = orgId;
  } else {
    where.userId = userId;
  }

  return prisma.invoice.findFirst({
    where,
    include: { lines: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getAuthInvoice(id, session.user.id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await getAuthInvoice(id, session.user.id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as InvoiceDraft & { changeComment?: string };
    const clean = sanitizeInvoiceDraft(body);
    const summary = calculateInvoiceSummary(clean);

    if (!summary.isValid) {
      return NextResponse.json(
        { error: summary.warnings.join(" • ") },
        { status: 400 },
      );
    }

    const changeComment =
      typeof body.changeComment === "string" && body.changeComment.trim()
        ? body.changeComment.trim()
        : "Updated invoice";

    // Ensure the invoice number stays unique (mirrors the POST route)
    let invoiceNumber = clean.invoiceNumber;
    if (invoiceNumber !== invoice.invoiceNumber) {
      const collision = await prisma.invoice.findFirst({
        where: {
          orgId: invoice.orgId ?? undefined,
          invoiceNumber,
          id: { not: id },
        },
      });
      if (collision) {
        invoiceNumber = `${invoiceNumber}-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    const beforeSnapshot = snapshotFromInvoice(invoice);

    // Wrap mutation + versioning in a single transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete old lines
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

      // Update invoice with new data and atomic version increment
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber,
          customerName: clean.customerName,
          customerGstin: clean.customerGstin,
          currency: clean.currency,
          dueDate: clean.dueDate,
          status: clean.status ?? invoice.status,
          subtotal: summary.subtotal,
          taxTotal: summary.taxTotal,
          total: summary.total,
          version: { increment: 1 },
          discountPercent: clean.discountPercent ?? invoice.discountPercent,
          discountAmount: summary.discountAmount,
          shippingCharges: clean.shippingCharges ?? invoice.shippingCharges,
          adjustment: clean.adjustment ?? invoice.adjustment,
          roundOff: summary.roundOff,
          amountInWords: clean.amountInWords ?? invoice.amountInWords,
          isTaxInclusive: clean.isTaxInclusive ?? invoice.isTaxInclusive,
          customerAddress: clean.customerAddress ?? invoice.customerAddress,
          customerEmail: clean.customerEmail ?? invoice.customerEmail,
          customerPhone: clean.customerPhone ?? invoice.customerPhone,
          customerState: clean.customerState ?? invoice.customerState,
          shippingSameAsBilling: clean.shippingSameAsBilling ?? invoice.shippingSameAsBilling,
          shippingName: clean.shippingName ?? invoice.shippingName,
          shippingAddress: clean.shippingAddress ?? invoice.shippingAddress,
          shippingPhone: clean.shippingPhone ?? invoice.shippingPhone,
          placeOfSupply: clean.placeOfSupply ?? invoice.placeOfSupply,
          reverseCharge: clean.reverseCharge ?? invoice.reverseCharge,
          poNumber: clean.poNumber ?? invoice.poNumber,
          referenceNumber: clean.referenceNumber ?? invoice.referenceNumber,
          notes: clean.notes ?? invoice.notes,
          terms: clean.terms ?? invoice.terms,
          bankName: clean.bankName ?? invoice.bankName,
          bankAccountName: clean.bankAccountName ?? invoice.bankAccountName,
          bankAccountNumber: clean.bankAccountNumber ?? invoice.bankAccountNumber,
          bankIfsc: clean.bankIfsc ?? invoice.bankIfsc,
          bankBranch: clean.bankBranch ?? invoice.bankBranch,
          upiId: clean.upiId ?? invoice.upiId,
          signatureName: clean.signatureName ?? invoice.signatureName,
          signatureDesignation: clean.signatureDesignation ?? invoice.signatureDesignation,
          lines: {
            create: clean.lines.map((line) => ({
              description: line.description,
              hsnCode: line.hsnCode,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              discount: line.discount,
            })),
          },
        },
        include: { lines: true },
      });

      // Create version snapshot with the new version number
      const afterSnapshot = snapshotFromInvoice(updated);
      const changes = diffSnapshots(beforeSnapshot, afterSnapshot);

      await tx.invoiceVersion.create({
        data: {
          invoiceId: id,
          version: updated.version,
          snapshot: JSON.stringify(afterSnapshot),
          changeComment,
        },
      });

      return { updated, changes };
    });

    return NextResponse.json({
      ...result.updated,
      changes: result.changes,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
