import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { autoPostPaymentJournal } from "@/lib/journal";



export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const payment = await prisma.payment.findFirst({
    where: { id, orgId },
    include: { invoice: { select: { invoiceNumber: true, customerName: true, total: true } } },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(payment);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, gatewayRef, upiTransactionId, paidAt } = body as {
      status?: string;
      gatewayRef?: string;
      upiTransactionId?: string;
      paidAt?: string;
    };

      const existing = await prisma.payment.findFirst({ where: { id, orgId } });
      if (!existing) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const validStatuses = ["pending", "completed", "failed", "refunded"];
      if (status !== undefined && !validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (gatewayRef) updateData.gatewayRef = gatewayRef;
    if (upiTransactionId) updateData.upiTransactionId = upiTransactionId;
    if (paidAt) updateData.paidAt = new Date(paidAt);
    if (status === "completed" && !paidAt) updateData.paidAt = new Date();

      // Payment + invoice-status flip + accounting post succeed or fail together.
      const payment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.payment.update({
          where: { id },
          data: updateData,
          include: { invoice: { select: { invoiceNumber: true, customerName: true } } },
        });

        // If payment is completed and linked to an invoice, mark invoice as paid
        if (status === "completed" && existing.invoiceId) {
          await tx.invoice.update({
            where: { id: existing.invoiceId },
            data: { status: "paid" },
          });
          await autoPostPaymentJournal(
            orgId,
            { id: updated.id, amount: updated.amount },
            updated.invoice ? `Payment for Invoice ${updated.invoice.invoiceNumber}` : `Payment ${updated.id.slice(0, 8)}`,
            tx,
          );
        }

        return updated;
      });

      return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const existing = await prisma.payment.findFirst({ where: { id, orgId } });
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

