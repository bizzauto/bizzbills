import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

type RiskLevel = "low" | "medium" | "high" | "critical";

type Prediction = {
  customerId: string;
  customerName: string;
  outstanding: number;
  riskScore: number;
  riskLevel: RiskLevel;
  recommendation: string;
  totalInvoices: number;
  totalPayments: number;
  avgDaysToPay: number | null;
  latePayments: number;
  lastPaymentDate: string | null;
};

function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

function getRecommendation(level: RiskLevel): string {
  switch (level) {
    case "low": return "Send gentle reminder";
    case "medium": return "Send firm reminder";
    case "high": return "Escalate to collections";
    case "critical": return "Consider legal action";
  }
}

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
  const riskFilter = searchParams.get("riskLevel");

  // Fetch all unpaid invoices with their completed payments
  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { in: ["sent", "overdue"] },
    },
    include: {
      payments: {
        where: { status: "completed" },
        select: { amount: true, paidAt: true, createdAt: true },
      },
    },
  });

  // Fetch all completed payments for the org (for historical analysis)
  const allPayments = await prisma.payment.findMany({
    where: { orgId, status: "completed" },
    select: { amount: true, invoiceId: true, paidAt: true, createdAt: true },
  });

  // Group invoices by customer name (Invoice model uses customerName string)
  const customerMap = new Map<string, {
    invoices: typeof invoices;
    outstanding: number;
    totalInvoices: number;
  }>();

  for (const inv of invoices) {
    const collected = inv.payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = inv.total - collected;
    if (outstanding <= 0) continue;

    const key = inv.customerName;
    const existing = customerMap.get(key);
    if (existing) {
      existing.invoices.push(inv);
      existing.outstanding += outstanding;
      existing.totalInvoices += 1;
    } else {
      customerMap.set(key, {
        invoices: [inv],
        outstanding,
        totalInvoices: 1,
      });
    }
  }

  // Build prediction for each customer
  const predictions: Prediction[] = [];

  for (const [customerName, data] of customerMap) {
    const allInvoicesForCustomer = await prisma.invoice.findMany({
      where: { orgId, customerName },
      select: {
        id: true,
        dueDate: true,
        total: true,
        createdAt: true,
        payments: {
          where: { status: "completed" },
          select: { amount: true, paidAt: true, createdAt: true },
        },
      },
    });

    const totalPaidAmount = allInvoicesForCustomer.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount, 0),
      0,
    );

    // Calculate average days to pay
    const paymentDelays: number[] = [];
    let latePayments = 0;
    const now = new Date();

    for (const inv of allInvoicesForCustomer) {
      if (inv.payments.length === 0) continue;
      for (const payment of inv.payments) {
        if (payment.paidAt) {
          const dueDate = new Date(inv.dueDate);
          const paidDate = new Date(payment.paidAt);
          const daysDiff = Math.floor((paidDate.getTime() - dueDate.getTime()) / 86400000);
          paymentDelays.push(daysDiff);
          if (daysDiff > 0) latePayments++;
        }
      }
    }

    const avgDaysToPay = paymentDelays.length > 0
      ? Math.round(paymentDelays.reduce((a, b) => a + b, 0) / paymentDelays.length)
      : null;

    // Find last payment date
    const allPaymentDates = allInvoicesForCustomer
      .flatMap((inv) => inv.payments)
      .filter((p) => p.paidAt)
      .map((p) => p.paidAt!)
      .sort((a, b) => b.getTime() - a.getTime());

    const lastPaymentDate = allPaymentDates.length > 0
      ? allPaymentDates[0].toISOString().split("T")[0]
      : null;

    // --- Risk scoring ---
    let riskScore = 0;

    // Factor 1: Late payment history (0-30 points)
    const totalPaymentsForCustomer = allInvoicesForCustomer.reduce(
      (sum, inv) => sum + inv.payments.length, 0,
    );
    if (totalPaymentsForCustomer > 0) {
      const lateRatio = latePayments / totalPaymentsForCustomer;
      riskScore += Math.round(lateRatio * 30);
    }

    // Factor 2: Average days to pay (0-25 points)
    if (avgDaysToPay !== null) {
      if (avgDaysToPay <= 0) riskScore += 0; // Early/punctual payer
      else if (avgDaysToPay <= 15) riskScore += 8;
      else if (avgDaysToPay <= 30) riskScore += 15;
      else if (avgDaysToPay <= 60) riskScore += 20;
      else riskScore += 25;
    } else {
      // No payment history at all - higher risk
      riskScore += 15;
    }

    // Factor 3: Outstanding amount relative to total invoice value (0-25 points)
    const totalInvoiceValue = allInvoicesForCustomer.reduce((s, inv) => s + inv.total, 0);
    if (totalInvoiceValue > 0) {
      const outstandingRatio = data.outstanding / totalInvoiceValue;
      riskScore += Math.round(outstandingRatio * 25);
    }

    // Factor 4: Number of unpaid invoices (0-10 points)
    if (data.totalInvoices >= 5) riskScore += 10;
    else if (data.totalInvoices >= 3) riskScore += 7;
    else if (data.totalInvoices >= 2) riskScore += 4;
    else riskScore += 2;

    // Factor 5: No payment history at all (0-10 points)
    if (totalPaymentsForCustomer === 0 && data.totalInvoices >= 1) {
      riskScore += 10;
    }

    // Cap at 100
    riskScore = Math.min(100, riskScore);

    const riskLevel = getRiskLevel(riskScore);

    predictions.push({
      customerId: customerName, // Using customerName as identifier since Invoice model uses string, not FK
      customerName,
      outstanding: +data.outstanding.toFixed(2),
      riskScore,
      riskLevel,
      recommendation: getRecommendation(riskLevel),
      totalInvoices: data.totalInvoices,
      totalPayments: totalPaidAmount,
      avgDaysToPay,
      latePayments,
      lastPaymentDate,
    });
  }

  // Sort by risk score descending (highest risk first)
  predictions.sort((a, b) => b.riskScore - a.riskScore);

  // Apply risk level filter if provided
  const filtered = riskFilter && riskFilter !== "all"
    ? predictions.filter((p) => p.riskLevel === riskFilter)
    : predictions;

  const summary = {
    totalOutstanding: +predictions.reduce((s, p) => s + p.outstanding, 0).toFixed(2),
    highRiskCount: predictions.filter((p) => p.riskScore > 60).length,
    highRiskAmount: +predictions
      .filter((p) => p.riskScore > 60)
      .reduce((s, p) => s + p.outstanding, 0)
      .toFixed(2),
    avgRiskScore: predictions.length > 0
      ? Math.round(predictions.reduce((s, p) => s + p.riskScore, 0) / predictions.length)
      : 0,
    totalCustomers: predictions.length,
  };

  return NextResponse.json({ predictions: filtered, summary });
}
