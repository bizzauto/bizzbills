import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft } from "@/lib/invoicing";
import { snapshotFromInvoice, diffSnapshots } from "@/lib/diff";

async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId;
}

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

    const beforeSnapshot = snapshotFromInvoice(invoice);

    // Wrap mutation + versioning in a single transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete old lines
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });

      // Update invoice with new data and atomic version increment
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: clean.invoiceNumber,
          customerName: clean.customerName,
          customerGstin: clean.customerGstin,
          currency: clean.currency,
          dueDate: clean.dueDate,
          subtotal: summary.subtotal,
          taxTotal: summary.taxTotal,
          total: summary.total,
          version: { increment: 1 },
          lines: {
            create: clean.lines.map((line) => ({
              description: line.description,
              hsnCode: line.hsnCode,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
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
          changeComment: body.changeComment || `${changes.length} change(s) made`,
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
