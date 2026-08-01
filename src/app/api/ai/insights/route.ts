import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * AI Dashboard Insights
 * Generates smart insight cards by analyzing business data:
 * - Collection risk (overdue invoices)
 * - Top customers by revenue
 * - Cash flow health score
 * - Anomaly detection (unusual invoices)
 * - Growth trend
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch invoices and payments in parallel
    const [recentInvoices, olderInvoices, overdueInvoices, payments30d, topCustomersData, expensesData] =
      await Promise.all([
        // Invoices from last 30 days
        prisma.invoice.findMany({
          where: {
            orgId,
            status: { not: "draft" },
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { id: true, total: true, customerName: true, status: true, dueDate: true, createdAt: true },
        }),
        // Invoices from 30-60 days ago
        prisma.invoice.findMany({
          where: {
            orgId,
            status: { not: "draft" },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
          select: { id: true, total: true, customerName: true, status: true },
        }),
        // Overdue invoices (past due date, not paid)
        prisma.invoice.findMany({
          where: {
            orgId,
            status: { notIn: ["draft", "paid"] },
            dueDate: { lt: now.toISOString().split("T")[0] },
          },
          include: {
            payments: { where: { status: "completed" }, select: { amount: true } },
          },
        }),
        // Payments in last 30 days
        prisma.payment.findMany({
          where: {
            orgId,
            status: "completed",
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { amount: true, createdAt: true },
        }),
        // Top customers by invoice count
        prisma.invoice.groupBy({
          by: ["customerName"],
          where: {
            orgId,
            status: { not: "draft" },
            createdAt: { gte: ninetyDaysAgo },
          },
          _sum: { total: true },
          _count: { id: true },
          orderBy: { _sum: { total: "desc" } },
          take: 5,
        }),
        // Expenses last 30 days
        prisma.expense.findMany({
          where: {
            orgId,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { amount: true, category: true },
        }),
      ]);

    // ── Collection Risk ──
    const overdueWithBalance = overdueInvoices.map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = inv.total - paid;
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        customerName: inv.customerName,
        total: inv.total,
        balance,
        daysOverdue,
        invoiceId: inv.id,
      };
    });
    const totalOverdueBalance = overdueWithBalance.reduce(
      (s, i) => s + i.balance,
      0
    );

    // ── Revenue Trend ──
    const recentTotal = recentInvoices.reduce((s, i) => s + i.total, 0);
    const olderTotal = olderInvoices.reduce((s, i) => s + i.total, 0);
    const growthRate =
      olderTotal > 0
        ? ((recentTotal - olderTotal) / olderTotal) * 100
        : recentTotal > 0
          ? 100
          : 0;

    // ── Cash Flow Health Score (0-100) ──
    const collected30d = payments30d.reduce((s, p) => s + p.amount, 0);
    const invoiced30d = recentTotal;
    const collectionEfficiency =
      invoiced30d > 0 ? (collected30d / invoiced30d) * 100 : 50;
    const overdueRatio =
      recentTotal > 0 ? (totalOverdueBalance / (recentTotal + totalOverdueBalance)) * 100 : 0;

    let healthScore = 50;
    healthScore += Math.min(25, collectionEfficiency * 0.25);
    healthScore -= Math.min(30, overdueRatio * 0.3);
    healthScore += Math.min(15, Math.max(-15, growthRate * 0.15));
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // ── Top Customers ──
    const topCustomers = topCustomersData.map((c) => ({
      name: c.customerName,
      totalRevenue: c._sum.total ?? 0,
      invoiceCount: c._count.id,
    }));

    // ── Expense Breakdown ──
    type ExpenseCat = { category: string; total: number };
    const expenseMap = new Map<string, number>();
    for (const e of expensesData) {
      expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + e.amount);
    }
    const expenseBreakdown: ExpenseCat[] = Array.from(expenseMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // ── Anomaly Detection (simple: invoices > 2x average) ──
    const avgInvoiceAmount =
      recentInvoices.length > 0
        ? recentInvoices.reduce((s, i) => s + i.total, 0) /
          recentInvoices.length
        : 0;
    const anomalies = recentInvoices
      .filter(
        (i) => i.total > avgInvoiceAmount * 2 && i.total > avgInvoiceAmount + 1000
      )
      .map((i) => ({
        invoiceId: i.id,
        customerName: i.customerName,
        total: i.total,
        avgAmount: avgInvoiceAmount,
        ratio: avgInvoiceAmount > 0 ? i.total / avgInvoiceAmount : 0,
      }))
      .slice(0, 5);

    return NextResponse.json({
      insights: {
        collectionRisk: {
          overdueCount: overdueWithBalance.length,
          totalOverdueBalance,
          topRisks: overdueWithBalance
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 5),
        },
        revenueTrend: {
          last30Days: recentTotal,
          previous30Days: olderTotal,
          growthRate,
          recentInvoiceCount: recentInvoices.length,
          previousInvoiceCount: olderInvoices.length,
        },
        cashFlowHealth: {
          score: healthScore,
          collectionEfficiency,
          collected30d,
          invoiced30d,
        },
        topCustomers,
        expenseBreakdown,
        anomalies,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
