import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * AI Cash Flow Prediction
 * Uses historical invoice + payment data with weighted moving average
 * to predict future cash inflows for the next 6 months.
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
    // Fetch 12 months of historical invoice data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const invoices = await prisma.invoice.findMany({
      where: {
        orgId,
        status: { not: "draft" },
        createdAt: { gte: twelveMonthsAgo },
      },
      include: {
        payments: {
          where: { status: "completed" },
          select: { amount: true, paidAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build monthly actuals: collected amounts
    type MonthData = {
      invoiced: number;
      collected: number;
      outstanding: number;
      invoiceCount: number;
    };
    const monthlyActuals: Record<string, MonthData> = {};

    for (const inv of invoices) {
      const month = new Date(inv.createdAt).toISOString().slice(0, 7);
      if (!monthlyActuals[month]) {
        monthlyActuals[month] = {
          invoiced: 0,
          collected: 0,
          outstanding: 0,
          invoiceCount: 0,
        };
      }
      monthlyActuals[month].invoiced += inv.total;
      monthlyActuals[month].invoiceCount++;

      for (const p of inv.payments) {
        const payMonth = new Date(p.paidAt ?? inv.createdAt)
          .toISOString()
          .slice(0, 7);
        if (!monthlyActuals[payMonth]) {
          monthlyActuals[payMonth] = {
            invoiced: 0,
            collected: 0,
            outstanding: 0,
            invoiceCount: 0,
          };
        }
        monthlyActuals[payMonth].collected += p.amount;
      }
    }

    // Compute outstanding per month
    for (const month of Object.keys(monthlyActuals)) {
      monthlyActuals[month].outstanding =
        monthlyActuals[month].invoiced - monthlyActuals[month].collected;
    }

    // Sort months
    const sortedMonths = Object.keys(monthlyActuals).sort();
    const collectedSeries = sortedMonths.map(
      (m) => monthlyActuals[m].collected
    );
    const invoicedSeries = sortedMonths.map(
      (m) => monthlyActuals[m].invoiced
    );

    // Weighted moving average (recent months weighted more)
    function weightedForecast(
      series: number[],
      monthsAhead: number
    ): number[] {
      if (series.length === 0) return Array(monthsAhead).fill(0);

      const windowSize = Math.min(6, series.length);
      const recent = series.slice(-windowSize);
      const weights = recent.map((_, i) => i + 1); // ascending weights
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      const weightedAvg =
        recent.reduce((s, val, i) => s + val * weights[i], 0) / totalWeight;

      // Simple trend detection
      const trend =
        series.length >= 2
          ? (series[series.length - 1] - series[0]) / series.length
          : 0;

      const predictions: number[] = [];
      for (let i = 1; i <= monthsAhead; i++) {
        predictions.push(Math.max(0, weightedAvg + trend * i));
      }
      return predictions;
    }

    const predictedCollection = weightedForecast(collectedSeries, 6);
    const predictedInvoicing = weightedForecast(invoicedSeries, 6);

    // Generate month labels for predictions
    const lastMonth = sortedMonths[sortedMonths.length - 1] || new Date().toISOString().slice(0, 7);
    const predictionMonths: string[] = [];
    const [year, mon] = lastMonth.split("-").map(Number);
    for (let i = 1; i <= 6; i++) {
      const m = mon + i;
      const y = year + Math.floor((m - 1) / 12);
      const mo = ((m - 1) % 12) + 1;
      predictionMonths.push(`${y}-${String(mo).padStart(2, "0")}`);
    }

    // Build combined series (historical + predicted)
    const historical = sortedMonths.map((m) => ({
      month: m,
      invoiced: monthlyActuals[m].invoiced,
      collected: monthlyActuals[m].collected,
      outstanding: monthlyActuals[m].outstanding,
      type: "historical" as const,
    }));

    const predicted = predictionMonths.map((m, i) => ({
      month: m,
      invoiced: predictedInvoicing[i],
      collected: predictedCollection[i],
      outstanding: predictedInvoicing[i] - predictedCollection[i],
      type: "predicted" as const,
    }));

    // Collection rate trend
    const avgCollectionRate =
      collectedSeries.length > 0
        ? collectedSeries.reduce((s, c, i) => {
            const inv = invoicedSeries[i];
            return s + (inv > 0 ? c / inv : 0);
          }, 0) / collectedSeries.length
        : 0;

    // Outstanding risk
    const totalOutstanding = invoices
      .filter((inv) => !inv.payments.length || inv.total > inv.payments.reduce((s, p) => s + p.amount, 0))
      .reduce((s, inv) => {
        const paid = inv.payments.reduce((sp, p) => sp + p.amount, 0);
        return s + (inv.total - paid);
      }, 0);

    return NextResponse.json({
      series: [...historical, ...predicted],
      summary: {
        avgMonthlyCollection:
          collectedSeries.length > 0
            ? collectedSeries.reduce((s, c) => s + c, 0) /
              collectedSeries.length
            : 0,
        avgMonthlyInvoicing:
          invoicedSeries.length > 0
            ? invoicedSeries.reduce((s, i) => s + i, 0) /
              invoicedSeries.length
            : 0,
        collectionRate: avgCollectionRate * 100,
        totalOutstanding,
        nextMonthPredicted: predictedCollection[0] ?? 0,
        sixMonthPredicted: predictedCollection.reduce((s, c) => s + c, 0),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate prediction" },
      { status: 500 }
    );
  }
}
