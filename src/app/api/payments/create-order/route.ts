import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { generateRazorpayOrder } from "@/lib/razorpay";

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
    const { amount, currency, invoiceId } = body as {
      amount: number;
      currency: string;
      invoiceId: string;
    };

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "Invoice ID and amount are required" },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      select: { id: true, total: true, currency: true, invoiceNumber: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const orderParams = generateRazorpayOrder({
      amount: amount ?? invoice.total,
      currency: currency ?? invoice.currency ?? "INR",
      receipt: `inv_${invoice.invoiceNumber}_${Date.now()}`,
      notes: { invoiceId: invoice.id },
    });

    // In production, call Razorpay API to create the order:
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    // const order = await razorpay.orders.create(orderParams);

    // Mock order for now
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return NextResponse.json({
      orderId: mockOrderId,
      amount: orderParams.amount,
      currency: orderParams.currency,
      receipt: orderParams.receipt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}
