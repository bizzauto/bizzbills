import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";



export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "products";

  interface Row { [key: string]: string | number }
  let rows: Row[] = [];

  if (entity === "products") {
    const products = await prisma.product.findMany({ where: { orgId }, include: { inventory: true } });
    rows = products.map((p) => ({
      name: p.name, sku: p.sku, hsnCode: p.hsnCode, category: p.category, brand: p.brand,
      sellingPrice: p.sellingPrice, purchasePrice: p.purchasePrice, unit: p.unit, taxRate: p.taxRate,
      stock: p.inventory.reduce((s, i) => s + i.quantity, 0), status: p.isActive ? "active" : "inactive",
    }));
  } else if (entity === "parties") {
    const parties = await prisma.party.findMany({ where: { orgId } });
    rows = parties.map((p) => ({ type: p.type, name: p.name, gstin: p.gstin, email: p.email, phone: p.phone, creditLimit: p.creditLimit, outstanding: p.outstandingBalance }));
  } else if (entity === "chart_of_accounts") {
    const accounts = await prisma.chartOfAccount.findMany({ where: { orgId } });
    rows = accounts.map((a) => ({ code: a.code, name: a.name, type: a.type }));
  } else if (entity === "invoices") {
    const invoices = await prisma.invoice.findMany({ where: { orgId }, include: { lines: true } });
    rows = invoices.flatMap((inv) => inv.lines.map((l) => ({
      invoiceNumber: inv.invoiceNumber, customerName: inv.customerName, date: inv.createdAt.toISOString().split("T")[0],
      status: inv.status, total: inv.total, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, hsnCode: l.hsnCode,
    })));
  }

  if (rows.length === 0) {
    return NextResponse.json({ headers: [], rows: [] });
  }

  const headers = Object.keys(rows[0]);
  return NextResponse.json({ headers, rows });
}

