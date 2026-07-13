import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft } from "@/lib/invoicing";
import { snapshotFromInvoice } from "@/lib/diff";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as InvoiceDraft;
    const clean = sanitizeInvoiceDraft(body);
    const summary = calculateInvoiceSummary(clean);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: clean.invoiceNumber,
        customerName: clean.customerName,
        customerGstin: clean.customerGstin,
        currency: clean.currency,
        dueDate: clean.dueDate,
        subtotal: summary.subtotal,
        taxTotal: summary.taxTotal,
        total: summary.total,
        version: 1,
        userId: session.user.id,
        lines: {
          create: clean.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
          })),
        },
      },
      include: { lines: true },
    });

    // Create version 1 snapshot
    const snapshot = snapshotFromInvoice(invoice);
    await prisma.invoiceVersion.create({
      data: {
        invoiceId: invoice.id,
        version: 1,
        snapshot: JSON.stringify(snapshot),
        changeComment: "Invoice created",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}
