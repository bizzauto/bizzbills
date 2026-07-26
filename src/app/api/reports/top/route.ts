import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getSessionOrgId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }).then((u) => u?.orgId);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5"), 20);
  const fromDate = searchParams.get("fromDate") ?? "2024-01-01";
  const toDate = searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate + "T23:59:59.999Z") },
    },
    include: { lines: true },
  });

  // Top customers by revenue
  const customerMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const inv of invoices) {
    if (!customerMap[inv.customerName]) customerMap[inv.customerName] = { name: inv.customerName, count: 0, total: 0 };
    customerMap[inv.customerName].count++;
    customerMap[inv.customerName].total += inv.total;
  }
  const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, limit);

  // Top products by revenue
  const productMap: Record<string, { name: string; count: number; total: number }> = {};
  for (const inv of invoices) {
    for (const line of inv.lines) {
      if (!line.description) continue;
      if (!productMap[line.description]) productMap[line.description] = { name: line.description, count: 0, total: 0 };
      productMap[line.description].count += line.quantity;
      productMap[line.description].total += line.quantity * line.unitPrice;
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, limit);

  // Summary
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalInvoices = invoices.length;

  return NextResponse.json({ topCustomers, topProducts, totalRevenue: +totalRevenue.toFixed(2), totalInvoices });
}
