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

  // Fetch all products
  const products = await prisma.product.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  // Fetch all invoice lines (non-draft invoices) in the date range
  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: {
        gte: new Date(fromDate),
        lte: new Date(toDate + "T23:59:59.999Z"),
      },
    },
    include: { lines: true },
  });

  // Build product sales map from invoice line descriptions
  // Match invoice lines to products by description or HSN code
  type ProductStats = {
    productId: string;
    name: string;
    sku: string;
    category: string;
    sellingPrice: number;
    purchasePrice: number;
    totalSoldQty: number;
    totalRevenue: number;
    estimatedCost: number;
    estimatedMargin: number;
    marginPercent: number;
    invoiceCount: number;
  };

  const productMap = new Map<string, ProductStats>();

  // Initialize from product catalog
  for (const p of products) {
    productMap.set(p.id, {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || "Uncategorized",
      sellingPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
      totalSoldQty: 0,
      totalRevenue: 0,
      estimatedCost: 0,
      estimatedMargin: 0,
      marginPercent: 0,
      invoiceCount: 0,
    });
  }

  // Aggregate from invoice lines — match by HSN code or name similarity
  for (const invoice of invoices) {
    const matchedProductIds = new Set<string>();

    for (const line of invoice.lines) {
      // Try to match by HSN code first
      if (line.hsnCode) {
        const match = products.find((p) => p.hsnCode === line.hsnCode);
        if (match) {
          const stats = productMap.get(match.id);
          if (stats) {
            stats.totalSoldQty += line.quantity;
            stats.totalRevenue += line.unitPrice * line.quantity;
            stats.estimatedCost +=
              line.quantity * match.purchasePrice;
            matchedProductIds.add(match.id);
          }
          continue;
        }
      }

      // Fallback: match by description containing product name (case-insensitive)
      const desc = line.description.toLowerCase();
      for (const p of products) {
        if (
          desc.includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(desc)
        ) {
          const stats = productMap.get(p.id);
          if (stats && !matchedProductIds.has(p.id)) {
            stats.totalSoldQty += line.quantity;
            stats.totalRevenue += line.unitPrice * line.quantity;
            stats.estimatedCost += line.quantity * p.purchasePrice;
            matchedProductIds.add(p.id);
          }
          break;
        }
      }
    }

    // Count invoices per matched product
    for (const pid of matchedProductIds) {
      const stats = productMap.get(pid);
      if (stats) stats.invoiceCount++;
    }
  }

  // Compute margins
  const productList: ProductStats[] = [];
  for (const stats of productMap.values()) {
    if (stats.totalSoldQty > 0) {
      stats.estimatedMargin = stats.totalRevenue - stats.estimatedCost;
      stats.marginPercent =
        stats.totalRevenue > 0
          ? (stats.estimatedMargin / stats.totalRevenue) * 100
          : 0;
    }
    productList.push(stats);
  }

  // Sort by revenue descending
  productList.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Separate into top performers and underperformers
  const topPerformers = productList
    .filter((p) => p.totalSoldQty > 0)
    .slice(0, 10);
  const underperformers = productList
    .filter((p) => p.totalSoldQty > 0 && p.marginPercent < 10)
    .slice(0, 10);
  const neverSold = productList.filter((p) => p.totalSoldQty === 0);

  // Category profitability summary
  const categoryMap: Record<
    string,
    { revenue: number; cost: number; margin: number; count: number }
  > = {};
  for (const p of productList) {
    const cat = p.category;
    if (!categoryMap[cat]) {
      categoryMap[cat] = { revenue: 0, cost: 0, margin: 0, count: 0 };
    }
    categoryMap[cat].revenue += p.totalRevenue;
    categoryMap[cat].cost += p.estimatedCost;
    categoryMap[cat].margin += p.estimatedMargin;
    categoryMap[cat].count++;
  }
  const categoryProfitability = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      ...data,
      marginPercent:
        data.revenue > 0 ? (data.margin / data.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.margin - a.margin);

  return NextResponse.json({
    topPerformers,
    underperformers,
    neverSold: neverSold.length,
    categoryProfitability,
    totals: {
      revenue: productList.reduce((s, p) => s + p.totalRevenue, 0),
      cost: productList.reduce((s, p) => s + p.estimatedCost, 0),
      margin: productList.reduce((s, p) => s + p.estimatedMargin, 0),
      productsSold: productList.filter((p) => p.totalSoldQty > 0).length,
      totalProducts: productList.length,
    },
  });
}
