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
    const where: any = orgId ? { orgId } : { userId: session.user.id };
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

    const { proformaNumber, customerName, customerGstin, currency, validUntil, notes, lines, subtotal, taxTotal, total } = body;

    if (!customerName || !lines?.length) {
      return NextResponse.json({ error: "Customer name and at least one line item required" }, { status: 400 });
    }

    // Auto-generate number if not provided
    const count = await prisma.proformaInvoice.count({ where: orgId ? { orgId } : { userId: session.user.id } });
    const number = proformaNumber || `PI-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.proformaInvoice.create({
      data: {
        proformaNumber: number,
        customerName,
        customerGstin: customerGstin || "",
        currency: currency || "INR",
        validUntil: validUntil || "",
        notes: notes || "",
        subtotal: subtotal || 0,
        taxTotal: taxTotal || 0,
        total: total || 0,
        status: "draft",
        userId: session.user.id,
        orgId: orgId || null,
        lines: {
          create: lines.map((l: any) => ({
            description: l.description || "",
            quantity: l.quantity || 0,
            unitPrice: l.unitPrice || 0,
            taxRate: l.taxRate || 0,
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
