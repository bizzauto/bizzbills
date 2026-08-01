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
  const fromDate = searchParams.get("fromDate") ?? "2024-01-01";
  const toDate =
    searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];
  const category = searchParams.get("category");

  // Fetch all products with inventory
  const where: Record<string, unknown> = { orgId };
  if (category) where.category = category;

  const products = await prisma.product.findMany({
    where,
    include: {
      inventory: {
        include: { warehouse: { select: { name: true } } },
      },
      batches: {
        where: { status: "active" },
        select: { batchNumber: true, quantity: true, expiryDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch stock movements in date range
  const movements = await prisma.stockMovement.findMany({
    where: {
      orgId,
      createdAt: {
        gte: new Date(fromDate),
        lte: new Date(toDate + "T23:59:59.999Z"),
      },
    },
    include: {
      product: { select: { name: true, sku: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Compute summary
  let totalStockUnits = 0;
  let totalStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categoryBreakdown: Record<string, { count: number; stock: number; value: number }> = {};

  for (const product of products) {
    const productStock = product.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0
    );
    const productValue = productStock * product.sellingPrice;
    totalStockUnits += productStock;
    totalStockValue += productValue;

    const isLow = product.inventory.some(
      (inv) => inv.minStock > 0 && inv.quantity <= inv.minStock
    );
    const isOutOf = productStock === 0;
    if (isLow) lowStockCount++;
    if (isOutOf) outOfStockCount++;

    const cat = product.category || "Uncategorized";
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, stock: 0, value: 0 };
    }
    categoryBreakdown[cat].count++;
    categoryBreakdown[cat].stock += productStock;
    categoryBreakdown[cat].value += productValue;
  }

  // Movement summary
  let totalIn = 0;
  let totalOut = 0;
  let totalAdjusted = 0;
  const movementTrend: Record<string, { in: number; out: number }> = {};

  for (const m of movements) {
    const month = new Date(m.createdAt).toISOString().slice(0, 7);
    if (!movementTrend[month]) movementTrend[month] = { in: 0, out: 0 };

    if (m.type === "in") {
      totalIn += m.quantity;
      movementTrend[month].in += m.quantity;
    } else if (m.type === "out") {
      totalOut += m.quantity;
      movementTrend[month].out += m.quantity;
    } else if (m.type === "adjustment") {
      totalAdjusted += Math.abs(m.quantity);
    }
  }

  // Categories array for chart
  const categories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b.value - a.value)
    .map(([name, data]) => ({ name, ...data }));

  return NextResponse.json({
    summary: {
      totalProducts: products.length,
      totalStockUnits,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      totalIn,
      totalOut,
      totalAdjusted,
    },
    categories,
    lowStockProducts: products
      .filter((p) =>
        p.inventory.some(
          (inv) => inv.minStock > 0 && inv.quantity <= inv.minStock
        )
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.inventory.reduce((s, i) => s + i.quantity, 0),
        minStock: Math.max(
          ...p.inventory.map((i) => i.minStock)
        ),
        warehouses: p.inventory.map((i) => ({
          name: i.warehouse.name,
          quantity: i.quantity,
        })),
      })),
    movementTrend: Object.entries(movementTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({ period, ...data })),
    recentMovements: movements.slice(0, 50).map((m) => ({
      id: m.id,
      productName: m.product.name,
      productSku: m.product.sku,
      warehouseName: m.warehouse.name,
      type: m.type,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
  });
}
