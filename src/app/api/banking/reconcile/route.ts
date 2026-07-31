import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSessionOrgId } from "@/lib/org";
import { NextResponse } from "next/server";

interface BankEntry {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

interface MatchedResult {
  bankEntry: BankEntry;
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    invoiceNumber: string | null;
    customerName: string | null;
  };
  dateDiff: number;
}

interface UnmatchedResult {
  bankEntry: BankEntry;
  reason: string;
}

const PROXIMITY_DAYS = 3;

function parseDateString(dateStr: string): Date {
  const normalized = dateStr.trim();
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;

  const parts = normalized.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 12) return new Date(a, b - 1, c);
    if (c < 100) return new Date(2000 + c, a - 1, b);
    return new Date(c, a - 1, b);
  }

  return new Date(NaN);
}

function daysBetween(d1: Date, d2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((d1.getTime() - d2.getTime()) / msPerDay));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { entries?: BankEntry[] };
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "At least one bank entry is required" },
        { status: 400 }
      );
    }

    const allPayments = await prisma.payment.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: { invoiceNumber: true, customerName: true },
        },
      },
    });

    const matched: MatchedResult[] = [];
    const unmatched: UnmatchedResult[] = [];
    const usedPaymentIds = new Set<string>();

    for (const entry of entries) {
      const entryDate = parseDateString(entry.date);
      if (isNaN(entryDate.getTime())) {
        unmatched.push({ bankEntry: entry, reason: "Invalid date" });
        continue;
      }

      let bestMatch: MatchedResult | null = null;
      let bestDays = Infinity;

      for (const payment of allPayments) {
        if (usedPaymentIds.has(payment.id)) continue;

        const amountMatch = Math.abs(payment.amount - Math.abs(entry.amount)) < 0.01;
        if (!amountMatch) continue;

        const paymentDate = payment.paidAt
          ? new Date(payment.paidAt)
          : new Date(payment.createdAt);
        const dayDiff = daysBetween(entryDate, paymentDate);

        if (dayDiff <= PROXIMITY_DAYS && dayDiff < bestDays) {
          bestDays = dayDiff;
          bestMatch = {
            bankEntry: entry,
            payment: {
              id: payment.id,
              amount: payment.amount,
              method: payment.method,
              status: payment.status,
              paidAt: payment.paidAt?.toISOString() ?? null,
              invoiceNumber: payment.invoice?.invoiceNumber ?? null,
              customerName: payment.invoice?.customerName ?? null,
            },
            dateDiff: dayDiff,
          };
        }
      }

      if (bestMatch) {
        matched.push(bestMatch);
        const matchedPayment = allPayments.find(
          (p) => p.id === bestMatch!.payment.id
        );
        if (matchedPayment) {
          usedPaymentIds.add(matchedPayment.id);
        }
      } else {
        const reasons: string[] = [];
        const hasAmountMatch = allPayments.some(
          (p) => Math.abs(p.amount - Math.abs(entry.amount)) < 0.01
        );
        if (!hasAmountMatch) {
          reasons.push("No payment with matching amount");
        } else {
          reasons.push(
            `No payment within ±${PROXIMITY_DAYS} days of ${entry.date}`
          );
        }
        unmatched.push({ bankEntry: entry, reason: reasons.join("; ") });
      }
    }

    const matchedTotal = matched.reduce(
      (sum, m) => sum + Math.abs(m.bankEntry.amount),
      0
    );
    const unmatchedTotal = unmatched.reduce(
      (sum, u) => sum + Math.abs(u.bankEntry.amount),
      0
    );

    return NextResponse.json({
      matched,
      unmatched,
      summary: {
        totalEntries: entries.length,
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        matchedTotal,
        unmatchedTotal,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}
