import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("groupBy") ?? "month";
  const fromDate = searchParams.get("fromDate") ?? "2024-01-01";
  const toDate =
    searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  // Fetch purchase orders (debit notes also count as purchase adjustments)
  const [orders, debitNotes] = await Promise.all([
    prisma.order.findMany({
      where: {
        orgId,
        orderType: "purchase_order",
        status: { notIn: ["draft", "cancelled"] },
        orderDate: {
          gte: new Date(fromDate),
          lte: new Date(toDate + "T23:59:59.999Z"),
        },
      },
      include: { lines: true },
      orderBy: { orderDate: "asc" },
    }),
    prisma.debitNote.findMany({
      where: {
        orgId,
        date: {
          gte: new Date(fromDate),
          lte: new Date(toDate + "T23:59:59.999Z"),
        },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  type PeriodData = {
    count: number;
    total: number;
    taxTotal: number;
    vendors: Set<string>;
  };
  const grouped: Record<string, PeriodData> = {};

  function getKey(d: Date): string {
    switch (groupBy) {
      case "day":
        return d.toISOString().split("T")[0];
      case "week": {
        const w = new Date(d);
        w.setDate(w.getDate() - w.getDay());
        return w.toISOString().split("T")[0];
      }
      case "quarter":
        return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      default:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  for (const order of orders) {
    const key = getKey(new Date(order.orderDate));
    if (!grouped[key]) {
      grouped[key] = { count: 0, total: 0, taxTotal: 0, vendors: new Set() };
    }
    grouped[key].count++;
    grouped[key].total += order.subtotal;
    grouped[key].taxTotal += order.taxTotal;
    grouped[key].vendors.add(order.partyName);
  }

  for (const dn of debitNotes) {
    const key = getKey(new Date(dn.date));
    if (!grouped[key]) {
      grouped[key] = { count: 0, total: 0, taxTotal: 0, vendors: new Set() };
    }
    grouped[key].count++;
    grouped[key].total += dn.subtotal;
    grouped[key].taxTotal += dn.taxTotal;
    grouped[key].vendors.add(dn.supplierName);
  }

  const series = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      count: data.count,
      total: data.total,
      taxTotal: data.taxTotal,
      uniqueVendors: data.vendors.size,
    }));

  const totals = series.reduce(
    (acc, s) => ({
      count: acc.count + s.count,
      total: acc.total + s.total,
      taxTotal: acc.taxTotal + s.taxTotal,
    }),
    { count: 0, total: 0, taxTotal: 0 }
  );

  return NextResponse.json({ series, totals });
}
