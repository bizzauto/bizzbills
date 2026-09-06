import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { invoiceId, amount, method, notes, upiTransactionId } = body as {
      invoiceId: string;
      amount?: number;
      method?: string;
      notes?: string;
      upiTransactionId?: string;
    };

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      select: { id: true, total: true, currency: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Money-integrity guard: when the client supplies an amount (online
    // payment flow), it must match the invoice total. Without this, a caller
    // could mark an invoice paid for any arbitrary amount.
    if (amount !== undefined && Math.abs(amount - invoice.total) > 0.01) {
      return NextResponse.json(
        { error: "Payment amount does not match the invoice total" },
        { status: 400 },
      );
    }

    // Don't double-record payments on an already-paid invoice.
    const existingPaid = await prisma.payment.findFirst({
      where: { invoiceId: invoice.id, status: "completed" },
      select: { id: true },
    });
    if (existingPaid) {
      return NextResponse.json(
        { error: "Invoice is already paid" },
        { status: 409 },
      );
    }

    const payment = await prisma.payment.create({
      data: {
        orgId,
        invoiceId: invoice.id,
        amount: amount ?? invoice.total,
        currency: invoice.currency,
        method: method ?? "cash",
        status: "completed",
        notes: notes ?? null,
        upiTransactionId: upiTransactionId ?? null,
        paidAt: new Date(),
      },
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to mark invoice as paid" }, { status: 500 });
  }
}

