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
  const groupBy = searchParams.get("groupBy") ?? "month";
  const fromDate = searchParams.get("fromDate") ?? "2024-01-01";
  const toDate = searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate + "T23:59:59.999Z") },
    },
    include: { lines: true, payments: { where: { status: "completed" }, select: { amount: true } } },
    orderBy: { createdAt: "asc" },
  });

  let grouped: Record<string, { count: number; total: number; collected: number; taxTotal: number; customers: Set<string> }> = {};

  for (const inv of invoices) {
    let key: string;
    const d = new Date(inv.createdAt);

    switch (groupBy) {
      case "day": key = d.toISOString().split("T")[0]; break;
      case "week": { const w = new Date(d); w.setDate(w.getDate() - w.getDay()); key = w.toISOString().split("T")[0]; break; }
      case "quarter": key = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`; break;
      case "year": key = String(d.getFullYear()); break;
      default: key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; break;
    }

    if (!grouped[key]) grouped[key] = { count: 0, total: 0, collected: 0, taxTotal: 0, customers: new Set() };
    grouped[key].count++;
    grouped[key].total += inv.total;
    grouped[key].taxTotal += inv.taxTotal;
    grouped[key].collected += inv.payments.reduce((s, p) => s + p.amount, 0);
    grouped[key].customers.add(inv.customerName);
  }

  const series = Object.entries(grouped).map(([period, g]) => ({
    period,
    count: g.count,
    total: +g.total.toFixed(2),
    taxTotal: +g.taxTotal.toFixed(2),
    collected: +g.collected.toFixed(2),
    uniqueCustomers: g.customers.size,
  }));

  const totals = { count: invoices.length, total: +invoices.reduce((s, i) => s + i.total, 0).toFixed(2), collected: +invoices.reduce((s, i) => s + i.payments.reduce((sp, p) => sp + p.amount, 0), 0).toFixed(2) };

  return NextResponse.json({ series, totals });
}

