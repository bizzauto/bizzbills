import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

type MonthData = {
  label: string;
  key: string;
  income: number;
  expenses: number;
  tax: number;
  netProfit: number;
};

export async function GET(request: NextRequest) {
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
  const toDate = searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  const startOfRange = new Date(fromDate + "T00:00:00.000Z");
  const endOfRange = new Date(toDate + "T23:59:59.999Z");

  // Fetch all completed payments (income) in date range
  const payments = await prisma.payment.findMany({
    where: {
      orgId,
      status: "completed",
      paidAt: { gte: startOfRange, lte: endOfRange },
    },
    select: { amount: true, paidAt: true },
  });

  // Fetch all expenses in date range (Expense.date is a String in YYYY-MM-DD format)
  const expenses = await prisma.expense.findMany({
    where: {
      orgId,
      date: { gte: fromDate, lte: toDate },
    },
    select: { amount: true, date: true },
  });

  // Fetch all non-draft invoices in date range for tax totals (GST collected)
  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      status: { not: "draft" },
      createdAt: { gte: startOfRange, lte: endOfRange },
    },
    select: { taxTotal: true, createdAt: true },
  });

  // Build monthly buckets
  const monthMap = new Map<string, MonthData>();

  function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function getMonthLabel(key: string): string {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function ensureMonth(key: string): void {
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        label: getMonthLabel(key),
        key,
        income: 0,
        expenses: 0,
        tax: 0,
        netProfit: 0,
      });
    }
  }

  // Accumulate income by month
  for (const payment of payments) {
    if (!payment.paidAt) continue;
    const key = getMonthKey(payment.paidAt);
    ensureMonth(key);
    const month = monthMap.get(key)!;
    month.income += payment.amount;
  }

  // Accumulate expenses by month
  for (const expense of expenses) {
    // Expense.date is a string like "2024-01-15"
    const expenseDate = new Date(expense.date + "T00:00:00.000Z");
    const key = getMonthKey(expenseDate);
    ensureMonth(key);
    const month = monthMap.get(key)!;
    month.expenses += expense.amount;
  }

  // Accumulate tax by month (GST collected on invoices)
  for (const invoice of invoices) {
    const key = getMonthKey(invoice.createdAt);
    ensureMonth(key);
    const month = monthMap.get(key)!;
    month.tax += invoice.taxTotal;
  }

  // Calculate net profit for each month
  const months: MonthData[] = [];
  for (const month of monthMap.values()) {
    month.income = +month.income.toFixed(2);
    month.expenses = +month.expenses.toFixed(2);
    month.tax = +month.tax.toFixed(2);
    month.netProfit = +(month.income - month.expenses).toFixed(2);
    months.push(month);
  }

  // Sort months chronologically
  months.sort((a, b) => a.key.localeCompare(b.key));

  // Compute totals
  const totals = {
    income: +months.reduce((s, m) => s + m.income, 0).toFixed(2),
    expenses: +months.reduce((s, m) => s + m.expenses, 0).toFixed(2),
    tax: +months.reduce((s, m) => s + m.tax, 0).toFixed(2),
    netProfit: +months.reduce((s, m) => s + m.netProfit, 0).toFixed(2),
  };

  return NextResponse.json({ months, totals });
}
