import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    const where: { orgId?: string; userId?: string } = orgId ? { orgId } : { userId: session.user.id };
    const invoices = await prisma.proformaInvoice.findMany({ where, orderBy: { createdAt: "desc" }, include: { lines: true } });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("GET proforma-invoices error:", error);
    return NextResponse.json({ error: "Failed to fetch proforma invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = await getSessionOrgId(session.user.id);
    const body = await request.json();

    const { proformaNumber, customerName, customerGstin, currency, validUntil, notes, lines } = body;

    if (!customerName || !lines?.length) {
      return NextResponse.json({ error: "Customer name and at least one line item required" }, { status: 400 });
    }

    // Auto-generate number if not provided, with collision fallback
    let number = proformaNumber;
    if (!number) {
      const count = await prisma.proformaInvoice.count({ where: orgId ? { orgId } : { userId: session.user.id } });
      number = `PI-${String(count + 1).padStart(3, "0")}`;
      const collision = await prisma.proformaInvoice.findFirst({
        where: { ...(orgId ? { orgId } : { userId: session.user.id }), proformaNumber: number },
        select: { id: true },
      });
      if (collision) {
        number = `${number}-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    // Server-side totals (single source of truth) — never trust client math
    let subtotal = 0;
    let taxTotal = 0;
    const cleanLines = lines.map((l: { description?: string; quantity?: number; unitPrice?: number; taxRate?: number; hsnCode?: string }) => {
      const qty = Number(l.quantity) || 0;
      const rate = Number(l.unitPrice) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const lineTotal = Math.round(qty * rate * 100) / 100;
      subtotal = Math.round((subtotal + lineTotal) * 100) / 100;
      taxTotal = Math.round((taxTotal + (lineTotal * taxRate) / 100) * 100) / 100;
      return { ...l, quantity: qty, unitPrice: rate, taxRate };
    });

    const invoice = await prisma.proformaInvoice.create({
      data: {
        proformaNumber: number,
        customerName,
        customerGstin: customerGstin || "",
        currency: currency || "INR",
        validUntil: validUntil || "",
        notes: notes || "",
        subtotal,
        taxTotal,
        total: Math.round((subtotal + taxTotal) * 100) / 100,
        status: "draft",
        userId: session.user.id,
        orgId: orgId || null,
        lines: {
          create: cleanLines.map((l: { description?: string; quantity: number; unitPrice: number; taxRate: number; hsnCode?: string }) => ({
            description: l.description || "",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            hsnCode: l.hsnCode || "",
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("POST proforma-invoices error:", error);
    return NextResponse.json({ error: "Failed to create proforma invoice" }, { status: 500 });
  }
}
