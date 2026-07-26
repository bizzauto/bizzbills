import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const inv = await prisma.recurringInvoice.findFirst({
    where: { id, orgId },
    include: { lines: true },
  });

  if (!inv) return NextResponse.json({ error: "Recurring invoice not found" }, { status: 404 });

  // Resolve invoice numbers for generated invoices
  let generatedInvoices: { id: string; invoiceNumber: string; total: number }[] = [];
  try {
    const ids: string[] = JSON.parse(inv.invoiceIds);
    if (ids.length > 0) {
      generatedInvoices = await prisma.invoice.findMany({
        where: { id: { in: ids } },
        select: { id: true, invoiceNumber: true, total: true },
      });
    }
  } catch {}

  return NextResponse.json({ ...inv, generatedInvoices });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, customerName, customerGstin, frequency, interval, endDate, lines } = body as {
      status?: string;
      customerName?: string;
      customerGstin?: string;
      frequency?: string;
      interval?: number;
      endDate?: string | null;
      lines?: { description: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string }[];
    };

    const existing = await prisma.recurringInvoice.findFirst({ where: { id, orgId } });
    if (!existing) return NextResponse.json({ error: "Recurring invoice not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (customerName) updateData.customerName = customerName;
    if (customerGstin !== undefined) updateData.customerGstin = customerGstin;
    if (frequency) updateData.frequency = frequency;
    if (interval) updateData.interval = interval;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    if (lines) {
      let subtotal = 0;
      let taxTotal = 0;
      const cleanLines = lines.map((l) => {
        const lineTotal = l.quantity * l.unitPrice;
        const lineTax = (lineTotal * l.taxRate) / 100;
        subtotal += lineTotal;
        taxTotal += lineTax;
        return l;
      });
      updateData.subtotal = subtotal;
      updateData.taxTotal = taxTotal;
      updateData.total = subtotal + taxTotal;

      await prisma.recurringInvoiceLine.deleteMany({ where: { recurringInvoiceId: id } });
      await prisma.recurringInvoiceLine.createMany({
        data: cleanLines.map((l) => ({
          recurringInvoiceId: id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          hsnCode: l.hsnCode ?? "",
        })),
      });
    }

    const updated = await prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: { lines: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update recurring invoice" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const existing = await prisma.recurringInvoice.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Recurring invoice not found" }, { status: 404 });

  await prisma.recurringInvoice.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
