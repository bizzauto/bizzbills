import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrgId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  return user?.orgId;
}

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
