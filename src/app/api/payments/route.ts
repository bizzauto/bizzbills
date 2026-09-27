import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { generateUpiLink } from "@/lib/upi";
import { autoPostPaymentJournal } from "@/lib/journal";
import { syncPaymentToInvoice, syncPartyAndBalance } from "@/lib/pipeline";



export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const payments = await prisma.payment.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { invoice: { select: { invoiceNumber: true, customerName: true } } },
  });

  return NextResponse.json(payments);
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
    const { invoiceId, amount, currency, method, notes } = body as {
      invoiceId?: string;
      amount: number;
      currency?: string;
      method?: string;
      notes?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    // If linked to an invoice, verify it exists and belongs to this org
    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, orgId },
        select: { id: true, total: true, currency: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orgId,
          invoiceId: invoiceId ?? null,
          amount,
          currency: currency ?? "INR",
          method: method ?? "upi",
          status: "completed",
          notes: notes ?? null,
          paidAt: new Date(),
        },
        include: { invoice: { select: { invoiceNumber: true, customerName: true } } },
      });

      // Auto-post the receipt to accounting: Debit Cash, Credit Receivable.
      await autoPostPaymentJournal(
        orgId,
        { id: created.id, amount },
        created.invoice?.invoiceNumber ? `Payment for Invoice ${created.invoice.invoiceNumber}` : `Direct payment ${created.id.slice(0, 8)}`,
        tx,
      );

      if (invoiceId) {
        await syncPaymentToInvoice(tx, orgId, invoiceId);
      } else if (created.invoice?.customerName) {
        await syncPartyAndBalance(tx, orgId, created.invoice.customerName);
      }

      return created;
    });

    // Generate UPI link if method is UPI
    let upiLink: string | null = null;
    if (method === "upi" || !method) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { upiId: true, name: true },
      });
      if (org?.upiId) {
        upiLink = generateUpiLink({
          pa: org.upiId,
          pn: org.name,
          am: String(amount),
          tn: `Payment ${payment.id.slice(0, 8)}`,
          tr: payment.id.slice(0, 12),
        });
      }
    }

    return NextResponse.json({ ...payment, upiLink }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

