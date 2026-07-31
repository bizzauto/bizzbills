import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

type Period = {
  label: string;
  startStr: string;
  endStr: string;
  inflow: number;
  outflow: number;
};

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function shortLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30", 10), 7), 365);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toISODate(today);
  const horizon = addDays(today, days);
  const horizonStr = toISODate(horizon);

  // --- Fetch data in parallel ---

  const [unpaidInvoices, recurringInvoices, expenses] = await Promise.all([
    // Unpaid invoices: status is sent or overdue, with completed payments to compute outstanding
    prisma.invoice.findMany({
      where: {
        orgId,
        status: { in: ["sent", "overdue"] },
      },
      include: {
        payments: {
          where: { status: "completed" },
          select: { amount: true },
        },
      },
    }),

    // Active recurring invoices whose next generation falls within the forecast window
    prisma.recurringInvoice.findMany({
      where: {
        orgId,
        status: "active",
        nextRunDate: { gte: today, lte: horizon },
      },
      select: {
        id: true,
        customerName: true,
        total: true,
        nextRunDate: true,
      },
    }),

    // Expenses with a date string within the forecast window
    prisma.expense.findMany({
      where: {
        orgId,
        date: { gte: todayStr, lte: horizonStr },
      },
      select: {
        id: true,
        amount: true,
        date: true,
      },
    }),
  ]);

  // --- Build weekly periods ---

  const periods: Period[] = [];
  let cursor = new Date(today);

  while (cursor < horizon) {
    const periodEnd = addDays(cursor, 6);
    const effectiveEnd = periodEnd > horizon ? horizon : periodEnd;
    periods.push({
      label: `${shortLabel(cursor)} - ${shortLabel(effectiveEnd)}`,
      startStr: toISODate(cursor),
      endStr: toISODate(effectiveEnd),
      inflow: 0,
      outflow: 0,
    });
    cursor = addDays(cursor, 7);
  }

  function findPeriod(dateStr: string): Period | undefined {
    return periods.find((p) => dateStr >= p.startStr && dateStr <= p.endStr);
  }

  // --- Project inflows from unpaid invoices ---

  for (const inv of unpaidInvoices) {
    const outstanding =
      inv.total -
      inv.payments.reduce((sum, p) => sum + p.amount, 0);
    if (outstanding <= 0) continue;

    // dueDate is stored as a string (YYYY-MM-DD); clamp to horizon if overdue
    const dueDate = inv.dueDate > horizonStr ? horizonStr : inv.dueDate;
    const target = dueDate < todayStr ? todayStr : dueDate;
    const period = findPeriod(target);
    if (period) {
      period.inflow += outstanding;
    }
  }

  // --- Project inflows from recurring invoices ---

  for (const rec of recurringInvoices) {
    const runDate = toISODate(rec.nextRunDate);
    if (runDate > horizonStr) continue;
    const target = runDate < todayStr ? todayStr : runDate;
    const period = findPeriod(target);
    if (period) {
      period.inflow += rec.total;
    }
  }

  // --- Project outflows from expenses ---

  for (const exp of expenses) {
    const period = findPeriod(exp.date);
    if (period) {
      period.outflow += exp.amount;
    }
  }

  // --- Compute running balance and summary ---

  let runningBalance = 0;
  let daysUntilCrunch: number | null = null;

  const projectedPeriods = periods.map((p) => {
    runningBalance += p.inflow - p.outflow;
    return {
      label: p.label,
      inflow: +p.inflow.toFixed(2),
      outflow: +p.outflow.toFixed(2),
      balance: +runningBalance.toFixed(2),
    };
  });

  // Find the first period where cumulative balance turns negative
  let cumulative = 0;
  for (let i = 0; i < periods.length; i++) {
    cumulative += periods[i].inflow - periods[i].outflow;
    if (cumulative < 0) {
      const periodStart = new Date(periods[i].startStr + "T00:00:00Z");
      daysUntilCrunch = Math.ceil(
        (periodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      break;
    }
  }

  const totalInflow = periods.reduce((s, p) => s + p.inflow, 0);
  const totalOutflow = periods.reduce((s, p) => s + p.outflow, 0);

  return NextResponse.json({
    periods: projectedPeriods,
    summary: {
      totalInflow: +totalInflow.toFixed(2),
      totalOutflow: +totalOutflow.toFixed(2),
      netFlow: +(totalInflow - totalOutflow).toFixed(2),
      daysUntilCrunch,
    },
  });
}
