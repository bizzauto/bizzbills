import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";

async function getProformaInvoice(id: string, userId: string) {
  const orgId = await getSessionOrgId(userId);
  const where: any = { id };
  if (orgId) where.orgId = orgId;
  else where.userId = userId;
  return prisma.proformaInvoice.findFirst({ where, include: { lines: true } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const invoice = await getProformaInvoice(id, session.user.id);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (error) {
    console.error("GET proforma-invoices/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const existing = await getProformaInvoice(id, session.user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { lines, ...fields } = body;

    const invoice = await prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.proformaInvoiceLine.deleteMany({ where: { proformaInvoiceId: id } });
      }
      return tx.proformaInvoice.update({
        where: { id },
        data: {
          ...fields,
          ...(lines ? {
            lines: {
              create: lines.map((l: any) => ({
                description: l.description || "",
                quantity: l.quantity || 0,
                unitPrice: l.unitPrice || 0,
                taxRate: l.taxRate || 0,
                hsnCode: l.hsnCode || "",
              })),
            },
          } : {}),
        },
        include: { lines: true },
      });
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("PATCH proforma-invoices/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const existing = await getProformaInvoice(id, session.user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.proformaInvoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE proforma-invoices/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
